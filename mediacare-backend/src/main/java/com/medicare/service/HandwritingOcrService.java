package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;

@Service
public class HandwritingOcrService {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final Environment environment;

    public HandwritingOcrService(Environment environment) {
        this.environment = environment;
    }

    public record OcrResult(String text, String provider, Double confidence) {
    }

    public String resolveProvider(String requestedProvider) {
        String candidate = Optional.ofNullable(requestedProvider)
                .filter(value -> !value.isBlank())
                .orElseGet(() -> environment.getProperty("medicare.ai.ocr.provider", "microsoft-trocr"));

        String normalized = candidate.trim().replace('_', '-').replace(' ', '-').toLowerCase(Locale.ROOT);

        return switch (normalized) {
            case "azure", "azure-ai", "azure-document", "azure-document-intelligence" -> "azure-document-intelligence";
            case "google", "google-vision", "google-document", "google-document-ai", "document-ai" ->
                "google-document-ai";
            case "aws", "aws-textract", "textract" -> "aws-textract";
            case "trocr", "microsoft-trocr", "handwriting-trocr" -> "microsoft-trocr";
            case "tesseract", "server-tesseract", "handwriting-tesseract" -> "microsoft-trocr";
            default -> normalized;
        };
    }

    public OcrResult recognize(String imageDataUrl, String requestedProvider) {
        String provider = resolveProvider(requestedProvider);

        return switch (provider) {
            case "microsoft-trocr" -> recognizeTrocr(imageDataUrl);
            case "azure-document-intelligence" -> recognizeAzureDocumentIntelligence(imageDataUrl);
            case "google-document-ai" -> recognizeGoogleDocumentAi(imageDataUrl);
            case "aws-textract" -> recognizeAwsTextract(imageDataUrl);
            default -> throw new IllegalArgumentException("Unsupported handwriting OCR provider: " + provider);
        };
    }

    private OcrResult recognizeTrocr(String imageDataUrl) {
        String serviceUrl = environment.getProperty("medicare.ai.ocr.trocr.url", "http://localhost:8001/ocr");
        try {
            String requestBody = OBJECT_MAPPER.writeValueAsString(OBJECT_MAPPER.createObjectNode()
                    .put("image", imageDataUrl));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(serviceUrl))
                    .timeout(Duration.ofMinutes(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = OBJECT_MAPPER.readTree(response.body());
            if (response.statusCode() >= 300) {
                JsonNode errors = root == null ? OBJECT_MAPPER.nullNode() : root.path("detail");
                String detail;
                if (errors.isArray() && !errors.isEmpty()) {
                    JsonNode firstError = errors.get(0);
                    detail = firstError.path("loc") + ": "
                            + firstError.path("msg").asText("Invalid OCR request");
                } else {
                    detail = errors.asText(response.body());
                }
                throw new IllegalStateException(
                        "TrOCR rejected the handwriting image (HTTP " + response.statusCode() + "): " + detail);
            }

            String text = root.path("text").asText("").trim();
            if (text.isBlank()) {
                throw new IllegalStateException("TrOCR did not recognize any handwriting.");
            }

            JsonNode confidenceNode = root.path("confidence");
            Double confidence = confidenceNode.isNumber() ? confidenceNode.asDouble() : null;
            String provider = root.path("provider").asText("microsoft-trocr-base-handwritten");
            return new OcrResult(text, provider, confidence);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("TrOCR recognition was interrupted.", e);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "Local TrOCR service is unavailable. Start the handwriting OCR service on port 8001.", e);
        }
    }

    private OcrResult recognizeAzureDocumentIntelligence(String imageDataUrl) {
        String endpoint = environment.getProperty("medicare.ai.ocr.azure.endpoint");
        String key = environment.getProperty("medicare.ai.ocr.azure.key");

        if (endpoint == null || endpoint.isBlank() || key == null || key.isBlank()) {
            throw new IllegalStateException(
                    "Azure Document Intelligence is not configured. Set medicare.ai.ocr.azure.endpoint and medicare.ai.ocr.azure.key.");
        }

        try {
            byte[] payload = decodeImageDataUrl(imageDataUrl);
            HttpRequest firstRequest = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint.replaceAll("/?$", "")
                            + "/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2024-11-15-preview"))
                    .header("Ocp-Apim-Subscription-Key", key)
                    .header("Content-Type", "application/octet-stream")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(payload))
                    .build();

            HttpResponse<String> firstResponse = HTTP_CLIENT.send(firstRequest, HttpResponse.BodyHandlers.ofString());
            if (firstResponse.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Azure Document Intelligence rejected the OCR request: " + firstResponse.body());
            }

            String operationLocation = firstResponse.headers().firstValue("Operation-Location").orElse(null);
            if (operationLocation == null || operationLocation.isBlank()) {
                throw new IllegalStateException("Azure Document Intelligence did not return an operation URL.");
            }

            HttpRequest pollRequest = HttpRequest.newBuilder()
                    .uri(URI.create(operationLocation))
                    .header("Ocp-Apim-Subscription-Key", key)
                    .GET()
                    .build();

            HttpResponse<String> pollResponse;
            String text = "";
            for (int attempt = 0; attempt < 12; attempt++) {
                pollResponse = HTTP_CLIENT.send(pollRequest, HttpResponse.BodyHandlers.ofString());
                String body = pollResponse.body();
                JsonNode root = OBJECT_MAPPER.readTree(body);
                String status = root.path("status").asText();
                if ("succeeded".equalsIgnoreCase(status)) {
                    text = extractTextFromAzureResponse(root);
                    break;
                }
                if ("failed".equalsIgnoreCase(status)) {
                    throw new IllegalStateException("Azure Document Intelligence failed: " + body);
                }
                Thread.sleep(1000L);
            }

            if (text.isBlank()) {
                throw new IllegalStateException("Azure Document Intelligence did not return any handwritten text.");
            }

            return new OcrResult(text, "azure-document-intelligence", 0.94d);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Azure Document Intelligence OCR was interrupted.", e);
        } catch (Exception e) {
            throw new IllegalStateException("Azure Document Intelligence OCR failed: " + e.getMessage(), e);
        }
    }

    private OcrResult recognizeGoogleDocumentAi(String imageDataUrl) {
        throw new UnsupportedOperationException(
                "Google Document AI is not enabled in this deployment yet. Configure medicare.ai.ocr.google.* and wire a service account token flow.");
    }

    private OcrResult recognizeAwsTextract(String imageDataUrl) {
        throw new UnsupportedOperationException(
                "AWS Textract is not enabled in this deployment yet. Configure medicare.ai.ocr.aws.* and add the AWS SDK client.");
    }

    private String extractTextFromAzureResponse(JsonNode root) {
        StringBuilder builder = new StringBuilder();
        JsonNode readResults = root.path("analyzeResult").path("readResults");
        if (readResults.isArray()) {
            for (JsonNode result : readResults) {
                JsonNode lines = result.path("lines");
                for (JsonNode line : lines) {
                    String value = line.path("content").asText();
                    if (!value.isBlank()) {
                        builder.append(value).append("\n");
                    }
                }
            }
        }
        return builder.toString().trim();
    }

    private byte[] decodeImageDataUrl(String imageDataUrl) {
        if (imageDataUrl == null || imageDataUrl.isBlank()) {
            throw new IllegalArgumentException("No image was supplied for handwriting OCR.");
        }

        String payload = imageDataUrl;
        int commaIndex = payload.indexOf(',');
        if (commaIndex >= 0) {
            payload = payload.substring(commaIndex + 1);
        }

        String normalized = payload.trim();
        return Base64.getDecoder().decode(normalized);
    }
}
