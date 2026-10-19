package com.medicare.controller;

import com.medicare.dto.OcrTrainingSampleRequest;
import com.medicare.service.OcrTrainingSampleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/ocr-training/samples")
@Tag(name = "OCR Training", description = "Store labeled handwriting samples for OCR model training")
public class OcrTrainingController {

    private final OcrTrainingSampleService sampleService;

    public OcrTrainingController(OcrTrainingSampleService sampleService) {
        this.sampleService = sampleService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Save a handwriting image with its verified transcription")
    public ResponseEntity<Map<String, Object>> save(@Valid @RequestBody OcrTrainingSampleRequest request) {
        try {
            String sampleId = sampleService.save(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("sampleId", sampleId));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }
}