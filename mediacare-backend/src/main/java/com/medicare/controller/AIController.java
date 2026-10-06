package com.medicare.controller;

import com.medicare.exception.ValidationException;
import com.medicare.service.AIService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/ai")
@Tag(name = "AI Clinical Tools", description = "Provider-backed clinical documentation and medication safety tools")
public class AIController {

    private final AIService aiService;

    public AIController(AIService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/interactions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Screen selected medications for known interaction risks")
    public ResponseEntity<Map<String, Object>> checkInteractions(@RequestBody Map<String, List<String>> body) {
        List<String> drugs = body.getOrDefault("drugs", Collections.emptyList());
        List<Map<String, Object>> interactions = new ArrayList<>();
        String lowerCombined = String.join(" ", drugs).toLowerCase();

        if (lowerCombined.contains("amlodipine") && lowerCombined.contains("simvastatin")) {
            interactions.add(Map.of(
                    "drugs", List.of("Amlodipine", "Simvastatin"),
                    "severity", "Moderate",
                    "effect", "Increased risk of myopathy / rhabdomyolysis due to CYP3A4 inhibition.",
                    "recommendation", "Verify the current formulary guidance and consider an alternative statin or dose adjustment."
            ));
        }
        if (lowerCombined.contains("lisinopril") && lowerCombined.contains("spironolactone")) {
            interactions.add(Map.of(
                    "drugs", List.of("Lisinopril", "Spironolactone"),
                    "severity", "Major",
                    "effect", "Hyperkalemia risk can increase with combined renin-angiotensin and potassium-sparing therapy.",
                    "recommendation", "Verify current guidance and monitor potassium and renal function as clinically appropriate."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "checkedCount", drugs.size(),
                "interactions", interactions,
                "source", "Curated medication-safety rules; verify against the hospital formulary"
        ));
    }

    @PostMapping("/summary")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Generate a provider-backed clinical documentation draft")
    public ResponseEntity<Map<String, Object>> summary(@RequestBody Map<String, String> body) {
        String notes = body.containsKey("notes") ? body.get("notes") : body.getOrDefault("handwritten", "");
        return ResponseEntity.ok(aiService.summarize(body.getOrDefault("transcript", ""), notes));
    }

    @PostMapping("/summarize-notes")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Backward-compatible clinical note summarization endpoint")
    public ResponseEntity<Map<String, Object>> summarizeNotes(@RequestBody Map<String, String> body) {
        Map<String, Object> generated = aiService.summarize(body.getOrDefault("text", ""), "");
        Map<String, Object> fields = generated.get("fields") instanceof Map<?, ?> m
                ? new LinkedHashMap<>((Map<String, Object>) m)
                : new LinkedHashMap<>();
        String summary = fields.entrySet().stream()
                .map(e -> e.getKey() + ": " + String.valueOf(e.getValue()))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        return ResponseEntity.ok(Map.of(
                "style", body.getOrDefault("style", "soap"),
                "summary", summary,
                "readabilityScore", "Provider-generated; clinician review required",
                "provider", generated.get("provider"),
                "timestamp", java.time.Instant.now().toString()
        ));
    }

    @PostMapping("/prescription")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Generate a provider-backed prescription draft")
    public ResponseEntity<Map<String, Object>> prescription(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(aiService.suggestPrescription(body));
    }

    @PostMapping("/clinical-query")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Query the configured clinical AI provider")
    public ResponseEntity<Map<String, Object>> clinicalQuery(@RequestBody Map<String, String> body) {
        String query = body.getOrDefault("query", "").trim();
        if (query.isBlank()) throw new ValidationException("Clinical query is required");
        return ResponseEntity.ok(aiService.clinicalQuery(query));
    }

    @PostMapping("/transcription")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Speech-to-text endpoint; configure a transcription provider before enabling production use")
    public ResponseEntity<Map<String, Object>> transcription(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long consultationId) {
        if (file.isEmpty()) throw new ValidationException("Audio file is required");
        throw new ValidationException("Speech-to-text provider is not configured. Configure MEDICARE_STT_URL before using real transcription.");
    }

    @PostMapping("/ocr")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "OCR endpoint; configure an OCR provider before enabling production use")
    public ResponseEntity<Map<String, Object>> ocr(@RequestBody Map<String, Object> body) {
        if (!body.containsKey("image")) throw new ValidationException("Image data is required");
        throw new ValidationException("OCR provider is not configured. Configure MEDICARE_OCR_URL before using real OCR.");
    }
}
