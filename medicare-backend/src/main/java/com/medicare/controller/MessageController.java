package com.medicare.controller;

import com.medicare.dto.ApiResponse;
import com.medicare.service.ClinicalMessageService;
import com.medicare.service.AdminService;
import com.medicare.service.MessageStreamService;
import com.medicare.security.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/messages")
@Tag(name = "Clinical Messaging", description = "Secure physician-patient messaging and chat communications")
public class MessageController {

    private final ClinicalMessageService clinicalMessageService;
    private final AdminService adminService;
    private final CurrentUserService currentUserService;
    private final MessageStreamService messageStreamService;

    public MessageController(ClinicalMessageService clinicalMessageService, AdminService adminService,
            CurrentUserService currentUserService, MessageStreamService messageStreamService) {
        this.clinicalMessageService = clinicalMessageService;
        this.adminService = adminService;
        this.currentUserService = currentUserService;
        this.messageStreamService = messageStreamService;
    }

    @GetMapping("/threads")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "List patient messaging threads for the authenticated doctor")
    public ResponseEntity<List<Map<String, Object>>> listThreads() {
        return ResponseEntity.ok(clinicalMessageService.listDoctorThreads());
    }

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT', 'ADMIN')")
    @Operation(summary = "Open an authenticated live message and notification update stream")
    public SseEmitter subscribeToMessageUpdates() {
        var user = currentUserService.getUser();
        String roleKind = user.getRole().name().replace("ROLE_", "").toLowerCase(java.util.Locale.ROOT);
        return messageStreamService.subscribe(user.getId(), roleKind);
    }

    @PostMapping("/{patientId}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Send a secure message to a patient")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long patientId,
            @RequestBody Map<String, String> body) {
        if (!Boolean.TRUE.equals(adminService.getWorkflowSettings().get("patientMessagingEnabled"))) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Patient messaging is temporarily unavailable");
        }
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
