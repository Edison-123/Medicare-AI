package com.medicare.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.exception.ValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
public class AIService {

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String model;

    public AIService(ObjectMapper objectMapper,
                     @Value("${medicare.ai.ollama-url:http://localhost:11434}") String ollamaUrl,
                     @Value("${medicare.ai.model:qwen2.5-coder:7b}") String model) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().baseUrl(ollamaUrl).build();
        this.model = model;
    }

    public Map<String, Object> summarize(String transcript, String notes) {
        String prompt = """
                You are a clinical documentation assistant. Produce a draft only; never claim that an AI draft is a diagnosis.
                Return JSON only with exactly these string fields:
                chiefComplaint, symptoms, diagnosis, medications, investigations, plan, followUp.
                Use only information present in the supplied transcript and notes. If a field is unknown, use an empty string.

                TRANSCRIPT:
                %s

                NOTES:
                %s
                """.formatted(safe(transcript), safe(notes));

        Map<String, Object> result = callJson(prompt);
        result.put("provider", "ollama:" + model);
        result.put("confidence", 0.0);
        return Map.of("provider", "ollama:" + model, "confidence", 0.0, "fields", resultWithoutMeta(result));
    }

    public Map<String, Object> suggestPrescription(Map<String, Object> request) {
        String clinicalContext = write(request);
        String prompt = """
                You are a clinical prescription drafting assistant. Return a DRAFT only for physician review.
                Never invent allergies, diagnoses, laboratory values, or patient facts not present in the input.
                Return JSON only with one field named items, which is an array of objects with exactly:
                name, strength, dosage, frequency, duration, route, food, instructions.
                If there is insufficient information, return an empty items array.

                CLINICAL INPUT:
                %s
                """.formatted(clinicalContext);

        Map<String, Object> result = callJson(prompt);
        Object items = result.getOrDefault("items", List.of());
        return Map.of("provider", "ollama:" + model, "items", items);
    }

    public Map<String, Object> clinicalQuery(String query) {
        String prompt = """
                You are a clinical knowledge assistant for a physician. Answer the question concisely.
                Distinguish general clinical information from patient-specific medical advice.
                Do not fabricate citations. State when verification against current clinical guidelines is needed.
                Return JSON with fields answer and caveat.

                QUESTION:
                %s
                """.formatted(safe(query));

        Map<String, Object> result = callJson(prompt);
        return Map.of(
                "query", query,
                "answer", String.valueOf(result.getOrDefault("answer", "")),
                "caveat", String.valueOf(result.getOrDefault("caveat", "Verify against current clinical guidance.")),
                "source", "Ollama local clinical assistant",
                "provider", "ollama:" + model
        );
    }

    private Map<String, Object> callJson(String prompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "prompt", prompt,
                "stream", false,
                "format", "json",
                "options", Map.of("temperature", 0.1)
        );

        try {
            Map<?, ?> response = restClient.post()
                    .uri("/api/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            String text = response == null ? null : String.valueOf(response.get("response"));
            if (text == null || text.isBlank()) {
                throw new ValidationException("AI provider returned an empty response");
            }
            JsonNode json = objectMapper.readTree(text);
            if (!json.isObject()) {
                throw new ValidationException("AI provider returned invalid JSON");
            }
            return objectMapper.convertValue(json, Map.class);
        } catch (ValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new com.medicare.exception.ServiceUnavailableException("AI provider is unavailable. Start Ollama and verify the configured model.");
        }
    }

    private Map<String, Object> resultWithoutMeta(Map<String, Object> result) {
        Map<String, Object> copy = new LinkedHashMap<>(result);
        copy.remove("provider");
        copy.remove("confidence");
        return copy;
    }

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ValidationException("Invalid AI request");
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
