package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.entity.Consultation;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AiAccuracyMetricsService {

    private final ObjectMapper objectMapper;

    public AiAccuracyMetricsService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> calculate(List<Consultation> consultations) {
        Totals transcription = new Totals();
        Totals ocr = new Totals();
        int reviewedDrafts = 0;
        int acceptedUnchangedDrafts = 0;
        long processingMillis = 0;
        int processingSamples = 0;

        for (Consultation consultation : consultations) {
            if (consultation.getAiStateJson() == null || consultation.getAiStateJson().isBlank()) {
                continue;
            }
            try {
                JsonNode state = objectMapper.readTree(consultation.getAiStateJson());
                addPair(state, "sttOriginalTranscript", "transcript", transcription, this::words);
                addPair(state, "ocrRecognizedText", "handwritten", ocr, this::characters);
                JsonNode processingDuration = state.path("processingMs");
                if (processingDuration.isNumber() && processingDuration.asLong() > 0) {
                    processingMillis += processingDuration.asLong();
                    processingSamples++;
                }
                if ("Completed".equalsIgnoreCase(consultation.getStatus())) {
                    JsonNode fieldReview = state.path("extraction").path("fieldReview");
                    DraftReview draftReview = reviewDraft(fieldReview);
                    if (draftReview.reviewed()) {
                        reviewedDrafts++;
                        if (draftReview.acceptedUnchanged()) {
                            acceptedUnchangedDrafts++;
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("transcriptionAccuracy", transcription.accuracy());
        metrics.put("transcriptionSampleCount", transcription.samples);
        metrics.put("ocrAccuracy", ocr.accuracy());
        metrics.put("ocrSampleCount", ocr.samples);
        metrics.put("doctorDraftAcceptanceRate", reviewedDrafts == 0 ? null
                : Math.round(acceptedUnchangedDrafts * 1000.0 / reviewedDrafts) / 10.0);
        metrics.put("doctorDraftReviewSampleCount", reviewedDrafts);
        metrics.put("avgProcessingSeconds", processingSamples == 0 ? null
                : Math.round(processingMillis / (double) processingSamples / 100.0) / 10.0);
        metrics.put("processingSampleCount", processingSamples);
        return metrics;
    }

    private DraftReview reviewDraft(JsonNode fieldReview) {
        if (!fieldReview.isObject() || fieldReview.isEmpty()) {
            return new DraftReview(false, false);
        }
        boolean acceptedUnchanged = true;
        var statuses = fieldReview.elements();
        while (statuses.hasNext()) {
            String status = statuses.next().asText("");
            if ("Needs review".equals(status) || !List.of("Confirmed", "Corrected", "Rejected").contains(status)) {
                return new DraftReview(false, false);
            }
            if (!"Confirmed".equals(status)) {
                acceptedUnchanged = false;
            }
        }
        return new DraftReview(true, acceptedUnchanged);
    }

    private void addPair(JsonNode state, String outputKey, String referenceKey,
            Totals totals, Tokenizer tokenizer) {
        String output = state.path(outputKey).asText("").trim();
        String reference = state.path(referenceKey).asText("").trim();
        if (output.isBlank() || reference.isBlank()) {
            return;
        }
        List<?> outputTokens = tokenizer.tokenize(output);
        List<?> referenceTokens = tokenizer.tokenize(reference);
        if (referenceTokens.isEmpty()) {
            return;
        }
        totals.add(distance(outputTokens, referenceTokens), referenceTokens.size());
    }

    private List<String> words(String text) {
        String normalized = text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
        return normalized.isEmpty() ? List.of() : Arrays.asList(normalized.split("\\s+"));
    }

    private List<Integer> characters(String text) {
        return text.toLowerCase(Locale.ROOT).trim().codePoints().boxed().toList();
    }

    private int distance(List<?> actual, List<?> reference) {
        int[] previous = new int[actual.size() + 1];
        for (int i = 0; i <= actual.size(); i++) {
            previous[i] = i;
        }
        for (int referenceIndex = 1; referenceIndex <= reference.size(); referenceIndex++) {
            int[] current = new int[actual.size() + 1];
            current[0] = referenceIndex;
            for (int actualIndex = 1; actualIndex <= actual.size(); actualIndex++) {
                int substitutionCost = actual.get(actualIndex - 1).equals(reference.get(referenceIndex - 1)) ? 0 : 1;
                current[actualIndex] = Math.min(
                        Math.min(current[actualIndex - 1] + 1, previous[actualIndex] + 1),
                        previous[actualIndex - 1] + substitutionCost);
            }
            previous = current;
        }
        return previous[actual.size()];
    }

    @FunctionalInterface
    private interface Tokenizer {
        List<?> tokenize(String text);
    }

    private record DraftReview(boolean reviewed, boolean acceptedUnchanged) {
    }

    private static class Totals {
        private long errors;
        private long referenceUnits;
        private int samples;

        private void add(int errorCount, int units) {
            errors += errorCount;
            referenceUnits += units;
            samples++;
        }

        private Double accuracy() {
            if (samples == 0 || referenceUnits == 0) {
                return null;
            }
            double accuracy = Math.max(0, 100.0 * (1.0 - (double) errors / referenceUnits));
            return Math.round(accuracy * 10.0) / 10.0;
        }
    }
}