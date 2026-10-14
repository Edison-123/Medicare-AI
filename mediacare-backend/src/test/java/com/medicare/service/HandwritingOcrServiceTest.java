package com.medicare.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
        assertEquals("azure-document-intelligence", service.resolveProvider("Azure Document Intelligence"));
        assertEquals("google-document-ai", service.resolveProvider("Google Document AI"));
        assertEquals("aws-textract", service.resolveProvider("AWS Textract"));
    }
}
