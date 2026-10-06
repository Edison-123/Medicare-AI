package com.medicare.controller;

import com.medicare.dto.ApiResponse;
import com.medicare.service.ClinicalMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/messages")
@Tag(name = "Clinical Messaging", description = "Secure physician-patient messaging and chat communications")
public class MessageController {

    private final ClinicalMessageService clinicalMessageService;

    public MessageController(ClinicalMessageService clinicalMessageService) {
        this.clinicalMessageService = clinicalMessageService;
    }

    @GetMapping("/threads")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "List patient messaging threads for the authenticated doctor")
    public ResponseEntity<List<Map<String, Object>>> listThreads() {
        return ResponseEntity.ok(clinicalMessageService.listDoctorThreads());
    }

    @PostMapping("/{patientId}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Send a secure message to a patient")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long patientId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(clinicalMessageService.sendFromDoctor(patientId, body.getOrDefault("text", "")));
    }

    @PostMapping("/{patientId}/read")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Mark a patient thread as read for the authenticated doctor")
    public ResponseEntity<ApiResponse> markAsRead(@PathVariable Long patientId) {
        clinicalMessageService.markDoctorThreadRead(patientId);
        return ResponseEntity.ok(new ApiResponse(true, "Thread marked as read"));
    }
}
