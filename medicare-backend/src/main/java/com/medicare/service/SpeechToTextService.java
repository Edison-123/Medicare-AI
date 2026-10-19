package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class SpeechToTextService {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final Environment environment;

    public SpeechToTextService(Environment environment) {
        this.environment = environment;
    }

    public record TranscriptionResult(String text, String provider, Double confidence) {
    }

    public TranscriptionResult transcribe(MultipartFile file) {
        String serviceUrl = environment.getProperty(
                "medicare.ai.transcription.whisper.url", "http://localhost:8082/transcribe");
        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(serviceUrl))
                    .timeout(Duration.ofMinutes(10))
                    .header("Content-Type", contentType)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = OBJECT_MAPPER.readTree(response.body());
            if (response.statusCode() >= 300) {
                String detail = root == null ? response.body() : root.path("detail").asText(response.body());
                throw new IllegalStateException(
                        "Whisper rejected the audio recording (HTTP " + response.statusCode() + "): " + detail);
            }

            String text = root.path("text").asText("").trim();
            if (text.isBlank()) {
                throw new IllegalStateException("Whisper did not recognize any speech.");
            }

            JsonNode confidenceNode = root.path("confidence");
            Double confidence = confidenceNode.isNumber() ? confidenceNode.asDouble() : null;
            String provider = root.path("provider").asText("openai/whisper-small.en");
            return new TranscriptionResult(text, provider, confidence);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Whisper transcription was interrupted.", exception);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Local Whisper service is unavailable. Start the speech recognition service on port 8082.",
                    exception);
        }
    }
}