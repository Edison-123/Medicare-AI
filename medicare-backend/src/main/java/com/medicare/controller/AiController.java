package com.medicare.controller;

import com.medicare.service.HandwritingOcrService;
import com.medicare.service.ClinicalSummaryService;
import com.medicare.service.DrugInteractionService;
import com.medicare.service.PrescriptionSuggestionService;
import com.medicare.service.SpeechToTextService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@Tag(name = "AI", description = "AI OCR and transcription services")
public class AiController {

    private final HandwritingOcrService handwritingOcrService;
    private final SpeechToTextService speechToTextService;
    private final ClinicalSummaryService clinicalSummaryService;
    private final PrescriptionSuggestionService prescriptionSuggestionService;
    private final DrugInteractionService drugInteractionService;

    public AiController(HandwritingOcrService handwritingOcrService, SpeechToTextService speechToTextService,
            ClinicalSummaryService clinicalSummaryService,
            PrescriptionSuggestionService prescriptionSuggestionService,
            DrugInteractionService drugInteractionService) {
        this.handwritingOcrService = handwritingOcrService;
        this.speechToTextService = speechToTextService;
        this.clinicalSummaryService = clinicalSummaryService;
        this.prescriptionSuggestionService = prescriptionSuggestionService;
        this.drugInteractionService = drugInteractionService;
    }

    @PostMapping("/interactions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Screen selected medications for potential drug interactions")
    public ResponseEntity<Map<String, Object>> checkInteractions(@RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(drugInteractionService.check(payload));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping("/prescription")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Generate untrusted medication suggestions for a prescription draft")
    public ResponseEntity<Map<String, Object>> suggestPrescription(@RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(prescriptionSuggestionService.suggest(payload));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping("/summary")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Draft a doctor-sourced consultation summary")
    public ResponseEntity<Map<String, Object>> summarize(@RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(clinicalSummaryService.summarize(payload));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping(value = "/transcription", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Transcribe a consultation audio recording")
    public ResponseEntity<Map<String, Object>> transcribe(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No audio recording was supplied."));
        }

        SpeechToTextService.TranscriptionResult result;
        try {
            result = speechToTextService.transcribe(file);
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", exception.getMessage()));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("text", result.text());
        response.put("provider", result.provider());
        response.put("confidence", result.confidence());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ocr")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Recognize handwriting from a base64 image payload")
    public ResponseEntity<Map<String, Object>> ocr(@RequestBody Map<String, Object> payload) {
        String image = payload.get("image") == null ? "" : String.valueOf(payload.get("image"));
        if (image.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No handwriting image was supplied."));
        }
        String provider = payload.get("provider") == null ? null : String.valueOf(payload.get("provider"));

        HandwritingOcrService.OcrResult result;
        try {
            result = handwritingOcrService.recognize(image, provider);
        } catch (IllegalStateException exception) {
            if (!handwritingOcrService.resolveProvider(provider).startsWith("microsoft-trocr")) {
                throw exception;
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", exception.getMessage()));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("text", result.text());
        response.put("provider", result.provider());
        response.put("confidence", result.confidence());
        return ResponseEntity.ok(response);
    }
}
