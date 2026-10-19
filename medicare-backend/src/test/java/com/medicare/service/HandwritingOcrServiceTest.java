package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HandwritingOcrServiceTest {

    @Test
    void defaultsToMicrosoftTrocrWhenNoProviderIsConfigured() {
        HandwritingOcrService service = new HandwritingOcrService(new MockEnvironment());
        assertEquals("microsoft-trocr", service.resolveProvider(null));
    }

    @Test
    void normalizesHandwritingAndCloudProviderNames() {
        HandwritingOcrService service = new HandwritingOcrService(new MockEnvironment());
        assertEquals("microsoft-trocr", service.resolveProvider("Microsoft TrOCR"));
        assertEquals("microsoft-trocr", service.resolveProvider("handwriting_trocr"));
        assertEquals("microsoft-trocr", service.resolveProvider("server-tesseract"));
        assertEquals("microsoft-trocr-training-adapter", service.resolveProvider("training-adapter"));
        assertEquals("microsoft-trocr-training-adapter", service.resolveProvider("TrOCR Training Adapter"));
        assertEquals("azure-document-intelligence", service.resolveProvider("Azure Document Intelligence"));
        assertEquals("google-document-ai", service.resolveProvider("Google Document AI"));
        assertEquals("aws-textract", service.resolveProvider("AWS Textract"));
    }

    @Test
    void sendsTrainingAdapterFlagOnlyForTrainingProvider() throws Exception {
        AtomicReference<JsonNode> payload = new AtomicReference<>();
        ObjectMapper objectMapper = new ObjectMapper();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/ocr", exchange -> {
            try (exchange) {
                payload.set(objectMapper.readTree(exchange.getRequestBody()));
                byte[] response = "{\"text\":\"sample\",\"provider\":\"trocr+training-adapter\"}"
                        .getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            }
        });
        server.start();

        try {
            MockEnvironment environment = new MockEnvironment().withProperty(
                    "medicare.ai.ocr.trocr.url",
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/ocr");
            HandwritingOcrService service = new HandwritingOcrService(environment);

            HandwritingOcrService.OcrResult result = service.recognize(
                    "data:image/png;base64,YWJj", "training-adapter");

            assertEquals("sample", result.text());
            assertTrue(payload.get().path("useTrainingAdapter").asBoolean());
        } finally {
            server.stop(0);
        }
    }
}
