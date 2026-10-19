package com.medicare.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.entity.Consultation;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiAccuracyMetricsServiceTest {

    private final AiAccuracyMetricsService metricsService = new AiAccuracyMetricsService(new ObjectMapper());

    @Test
    void calculatesWordAndCharacterReferenceMatchForCompletedConsultations() {
        Consultation consultation = consultation("Completed", """
                {"sttOriginalTranscript":"the patient reports cough",
                 "transcript":"the patient report cough",
                 "ocrRecognizedText":"dose 5 mg","handwritten":"dose 5 mg","processingMs":1500}
                """);

        Map<String, Object> metrics = metricsService.calculate(List.of(consultation));

        assertEquals(75.0, metrics.get("transcriptionAccuracy"));
        assertEquals(1, metrics.get("transcriptionSampleCount"));
        assertEquals(100.0, metrics.get("ocrAccuracy"));
        assertEquals(1, metrics.get("ocrSampleCount"));
        assertEquals(1.5, metrics.get("avgProcessingSeconds"));
        assertEquals(1, metrics.get("processingSampleCount"));
    }

    @Test
    void includesAllConsultationStatusesWithPairsAndExcludesMissingOutputs() {
        Consultation completedWithPair = consultation("Completed", """
                {"sttOriginalTranscript":"raw words","transcript":"fixed words",
                 "ocrRecognizedText":"raw","handwritten":"fixed","processingMs":1000}
                    """);
        Consultation incomplete = consultation("In Progress", """
                {"sttOriginalTranscript":"raw words","transcript":"fixed words","processingMs":3000}
                    """);
        Consultation missingOriginal = consultation("Completed", """
                {"transcript":"final text"}
                """);

        Map<String, Object> metrics = metricsService.calculate(List.of(completedWithPair, incomplete, missingOriginal));

        assertEquals(50.0, metrics.get("transcriptionAccuracy"));
        assertEquals(2, metrics.get("transcriptionSampleCount"));
        assertEquals(0.0, metrics.get("ocrAccuracy"));
        assertEquals(1, metrics.get("ocrSampleCount"));
        assertEquals(2.0, metrics.get("avgProcessingSeconds"));
        assertEquals(2, metrics.get("processingSampleCount"));
    }

    @Test
    void countsOnlyCompletedDraftsWithFinalReviewAndAcceptsOnlyUnchangedFields() {
        Consultation accepted = consultation("Completed", """
                {"extraction":{"fieldReview":{"diagnosis":"Confirmed","plan":"Confirmed"}}}
                """);
        Consultation corrected = consultation("Completed", """
                {"extraction":{"fieldReview":{"diagnosis":"Confirmed","plan":"Corrected"}}}
                """);
        Consultation rejected = consultation("Completed", """
                {"extraction":{"fieldReview":{"diagnosis":"Rejected"}}}
                """);
        Consultation pending = consultation("Completed", """
                {"extraction":{"fieldReview":{"diagnosis":"Needs review"}}}
                """);
        Consultation inProgress = consultation("In Progress", """
                {"extraction":{"fieldReview":{"diagnosis":"Confirmed"}}}
                """);

        Map<String, Object> metrics = metricsService.calculate(
                List.of(accepted, corrected, rejected, pending, inProgress));

        assertEquals(33.3, metrics.get("doctorDraftAcceptanceRate"));
        assertEquals(3, metrics.get("doctorDraftReviewSampleCount"));
    }

    private Consultation consultation(String status, String aiState) {
        Consultation consultation = new Consultation();
        consultation.setStatus(status);
        consultation.setAiStateJson(aiState);
        return consultation;
    }
}