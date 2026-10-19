package com.medicare.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.net.InetSocketAddress;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClinicalSummaryServiceTest {

    @Test
    void extractsOnlyExplicitDoctorStatements() {
        String transcript = "Patient: I have nausea.\n"
                + "Doctor: Start this only if symptoms persist. Patient: I took one already.\n"
                + "Unlabeled statement.";

        assertEquals("Start this only if symptoms persist.",
                ClinicalSummaryService.extractDoctorStatements(transcript));
    }

    @Test
    void ignoresUnlabeledTranscript() {
        assertEquals("", ClinicalSummaryService.extractDoctorStatements("Take one tablet every day."));
    }

    @Test
    void extractsUnlabeledTranscriptWithUnattributedEvidence() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode draft = mapper.createObjectNode();
        ObjectNode fields = draft.putObject("fields");
        fields.put("symptoms", "dry cough for three days");
        fields.put("diagnosis", "pneumonia");
        ObjectNode evidence = draft.putObject("evidence");
        evidence.putObject("symptoms").put("source", "audio_transcript")
                .put("quote", "I've had a dry cough for three days.");
        evidence.putObject("diagnosis").put("source", "audio_transcript")
                .put("quote", "The doctor diagnosed pneumonia.");

        ObjectNode response = mapper.createObjectNode();
        response.putObject("message").put("content", mapper.writeValueAsString(draft));
        byte[] responseBytes = mapper.writeValueAsBytes(response);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chat", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            exchange.getResponseBody().write(responseBytes);
            exchange.close();
        });
        server.start();

        try {
            MockEnvironment environment = new MockEnvironment()
                    .withProperty("medicare.ai.summary.ollama.url",
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat")
                    .withProperty("medicare.ai.summary.ollama.model", "test-model");
            ClinicalSummaryService service = new ClinicalSummaryService(environment);
            Map<String, Object> result = service.summarize(Map.of(
                    "consultation", Map.of(),
                    "transcript", "I've had a dry cough for three days. My neighbor thinks it's pneumonia.",
                    "handwritten", "",
                    "notes", ""));
            var extractedFields = (com.fasterxml.jackson.databind.JsonNode) result.get("fields");
            var returnedEvidence = (com.fasterxml.jackson.databind.JsonNode) result.get("evidence");

            assertEquals("I've had a dry cough for three days.", extractedFields.path("symptoms").asText());
            assertEquals("audio_transcript", returnedEvidence.path("symptoms").path("source").asText());
            assertEquals("unattributed", returnedEvidence.path("symptoms").path("speaker").asText());
            assertEquals("I've had a dry cough for three days.",
                    returnedEvidence.path("symptoms").path("quote").asText());
            assertEquals("", extractedFields.path("diagnosis").asText());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void extractsClinicalFieldsFromPunctuationPoorUnlabeledConversation() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode draft = mapper.createObjectNode();
        ObjectNode fields = draft.putObject("fields");
        for (String key : new String[] { "chiefComplaint", "symptoms", "exam", "diagnosis", "diagnosisStatus",
                "medications", "investigations", "plan", "followUp" }) {
            fields.put(key, "");
        }
        fields.putObject("vitals");

        ObjectNode response = mapper.createObjectNode();
        response.putObject("message").put("content", mapper.writeValueAsString(draft));
        byte[] responseBytes = mapper.writeValueAsBytes(response);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chat", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            exchange.getResponseBody().write(responseBytes);
            exchange.close();
        });
        server.start();

        String transcript = "good morning what brings you in today i have had a dry cough for three days and a fever last night "
                + "no chest pain or shortness of breath i got hives after taking penicillin years ago "
                + "your temperature is 37.8 degrees celsius and oxygen saturation is 98. lungs are clear "
                + "my assessment is probable viral upper respiratory infection Provisional. "
                + "Start acetaminophen 500 mg by mouth every six hours as needed for fever, for up to three days. "
                + "Drink fluids. Follow up in one week if symptoms persist. Seek urgent care for breathing difficulty.";

        try {
            MockEnvironment environment = new MockEnvironment()
                    .withProperty("medicare.ai.summary.ollama.url",
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat")
                    .withProperty("medicare.ai.summary.ollama.model", "test-model");
            ClinicalSummaryService service = new ClinicalSummaryService(environment);
            Map<String, Object> result = service.summarize(Map.of(
                    "consultation", Map.of(),
                    "transcript", transcript,
                    "handwritten", "dry cough. no sob. fever.",
                    "notes", ""));
            var extracted = (com.fasterxml.jackson.databind.JsonNode) result.get("fields");
            var evidence = (com.fasterxml.jackson.databind.JsonNode) result.get("evidence");

            assertEquals("dry cough for three days and a fever last night", extracted.path("chiefComplaint").asText());
            assertEquals(true, extracted.path("symptoms").asText().contains("no chest pain or shortness of breath"));
            assertEquals(true, extracted.path("symptoms").asText().contains("hives after taking penicillin"));
            assertEquals(false, extracted.path("symptoms").asText().contains("acetaminophen"));
            assertEquals("lungs are clear", extracted.path("exam").asText());
            assertEquals("probable viral upper respiratory infection", extracted.path("diagnosis").asText());
            assertEquals("Provisional", extracted.path("diagnosisStatus").asText());
            assertEquals(true, extracted.path("medications").asText()
                    .contains("Start acetaminophen 500 mg by mouth every six hours as needed for fever"));
            assertEquals("Drink fluids", extracted.path("plan").asText());
            assertEquals(true, extracted.path("followUp").asText().contains("one week"));
            assertEquals("37.8", extracted.path("vitals").path("temp").asText());
            assertEquals("98", extracted.path("vitals").path("spo2").asText());
            assertEquals("audio_transcript", evidence.path("symptoms").path("source").asText());
            assertEquals("unattributed", evidence.path("symptoms").path("speaker").asText());
            assertEquals(true, evidence.path("exam").path("quote").asText().matches("(?i)lungs are clear"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void onlyReturnsModelFieldsBackedByDoctorEvidence() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode draft = mapper.createObjectNode();
        draft.put("chiefComplaint", "Dry cough for two days.");
        draft.put("symptoms", "dry cough");
        draft.put("exam", "Blood pressure 118 over 76");
        draft.put("diagnosis", "pneumonia");
        draft.put("plan", "rest and fluids");
        draft.putObject("vitals").put("bp", "118 over 76").put("recordedAt", "Synthetic test note");

        ObjectNode response = mapper.createObjectNode();
        response.putObject("message").put("content", mapper.writeValueAsString(draft));
        byte[] responseBytes = mapper.writeValueAsBytes(response);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chat", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            exchange.getResponseBody().write(responseBytes);
            exchange.close();
        });
        server.start();

        try {
            MockEnvironment environment = new MockEnvironment()
                    .withProperty("medicare.ai.summary.ollama.url",
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat")
                    .withProperty("medicare.ai.summary.ollama.model", "test-model");
            ClinicalSummaryService service = new ClinicalSummaryService(environment);
            Map<String, Object> result = service.summarize(Map.of(
                    "consultation", Map.of(),
                    "transcript",
                    "Doctor: Dry cough for two days. Blood pressure 118 over 76. Plan: rest and fluids. Patient: patient thinks pneumonia.",
                    "handwritten", "dry cough.",
                    "notes", ""));
            var fields = (com.fasterxml.jackson.databind.JsonNode) result.get("fields");

            assertEquals("Dry cough for two days", fields.path("chiefComplaint").asText());
            assertEquals("Dry cough for two days.", fields.path("symptoms").asText());
            assertEquals("118 over 76", fields.path("vitals").path("bp").asText());
            assertEquals("", fields.path("vitals").path("recordedAt").asText());
            assertEquals("", fields.path("exam").asText());
            assertEquals("", fields.path("diagnosis").asText());
            assertEquals("", fields.path("diagnosisStatus").asText());
            assertEquals("rest and fluids", fields.path("plan").asText());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void fillsOnlyExplicitFieldsWhenModelLeavesThemEmpty() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode draft = mapper.createObjectNode();
        ObjectNode fields = draft.putObject("fields");
        for (String key : new String[] { "chiefComplaint", "symptoms", "exam", "diagnosis", "medications",
                "investigations", "plan", "followUp" }) {
            fields.put(key, "");
        }
        fields.putObject("vitals");

        ObjectNode response = mapper.createObjectNode();
        response.putObject("message").put("content", mapper.writeValueAsString(draft));
        byte[] responseBytes = mapper.writeValueAsBytes(response);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chat", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            exchange.getResponseBody().write(responseBytes);
            exchange.close();
        });
        server.start();

        String audio = "Doctor: The patient reports a dry cough that began two days ago. "
                + "The cough is non-productive. The patient reports no shortness of breath, no chest pain, and no fever at home. "
                + "Blood pressure is 118 over 76 millimeters of mercury. Heart rate is 74 beats per minute. "
                + "Temperature is 37.2 degrees Celsius. Oxygen saturation is 98% on room air. "
                + "Examination shows mild pharyngeal erythema. Breath sounds are clear on both sides. "
                + "Working assessment is probable viral upper respiratory infection. Diagnosis status is provisional. No new medication is prescribed. "
                + "Continue the current amlodipine 5 mg once daily. A complete blood count is ordered today. "
                + "The plan is rest, oral fluids, and monitoring symptoms at home. Follow up in one week if the cough persists. "
                + "Seek urgent assessment sooner for breathing difficulty.";
        String handwriting = "dry cough 2 days BP 118776\nTemp 37. 2\nmedications none.\n"
                + "CBC ordered rest fluids.\nassessment viral URI follow up 1 week.";

        try {
            MockEnvironment environment = new MockEnvironment()
                    .withProperty("medicare.ai.summary.ollama.url",
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat")
                    .withProperty("medicare.ai.summary.ollama.model", "test-model");
            ClinicalSummaryService service = new ClinicalSummaryService(environment);
            Map<String, Object> result = service.summarize(Map.of(
                    "consultation", Map.of(), "transcript", audio, "handwritten", handwriting, "notes", ""));
            var extracted = (com.fasterxml.jackson.databind.JsonNode) result.get("fields");

            assertEquals("dry cough that began two days ago", extracted.path("chiefComplaint").asText());
            assertEquals(true, extracted.path("symptoms").asText().contains("non-productive"));
            assertEquals(false, extracted.path("symptoms").asText().contains("plan is rest"));
            assertEquals(true, extracted.path("exam").asText().contains("mild pharyngeal erythema"));
            assertEquals("probable viral upper respiratory infection", extracted.path("diagnosis").asText());
            assertEquals("Provisional", extracted.path("diagnosisStatus").asText());
            assertEquals(true,
                    extracted.path("medications").asText().contains("Continue the current amlodipine 5 mg once daily"));
            assertEquals("complete blood count is ordered today", extracted.path("investigations").asText());
            assertEquals("rest, oral fluids, and monitoring symptoms at home", extracted.path("plan").asText());
            assertEquals(true, extracted.path("followUp").asText().contains("one week"));
            assertEquals(true, extracted.path("followUp").asText().contains("Seek urgent assessment sooner"));
            assertEquals("118 over 76", extracted.path("vitals").path("bp").asText());
            assertEquals("74 beats per minute", extracted.path("vitals").path("hr").asText());
            assertEquals("37.2", extracted.path("vitals").path("temp").asText());
            assertEquals("98%", extracted.path("vitals").path("spo2").asText());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void normalizesAnOcrSpacedTemperatureDecimalWithoutChangingItsEvidence() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode draft = mapper.createObjectNode();
        draft.putObject("fields").putObject("vitals");
        ObjectNode response = mapper.createObjectNode();
        response.putObject("message").put("content", mapper.writeValueAsString(draft));
        byte[] responseBytes = mapper.writeValueAsBytes(response);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chat", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            exchange.getResponseBody().write(responseBytes);
            exchange.close();
        });
        server.start();

        try {
            MockEnvironment environment = new MockEnvironment()
                    .withProperty("medicare.ai.summary.ollama.url",
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat")
                    .withProperty("medicare.ai.summary.ollama.model", "test-model");
            ClinicalSummaryService service = new ClinicalSummaryService(environment);
            Map<String, Object> result = service.summarize(Map.of(
                    "consultation", Map.of(), "transcript", "", "handwritten", "Temp 37. 2", "notes", ""));
            var fields = (com.fasterxml.jackson.databind.JsonNode) result.get("fields");
            var evidence = (com.fasterxml.jackson.databind.JsonNode) result.get("evidence");

            assertEquals("37.2", fields.path("vitals").path("temp").asText());
            assertEquals("Temp 37. 2", evidence.path("vitals").path("temp").path("quote").asText());
        } finally {
            server.stop(0);
        }
    }
}