package com.medicare.controller;

import com.medicare.dto.ApiResponse;
import com.medicare.dto.RefillActionRequest;
import com.medicare.entity.RefillRequest;
import com.medicare.service.DoctorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/doctors")
@Tag(name = "Doctor Portal", description = "Endpoints for physician dashboard, renewals, and consultations")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping("/me/dashboard")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get Doctor dashboard metrics, appointments, and recent Rx")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(doctorService.getDashboard());
    }

    @GetMapping("/me/refills")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get pending prescription refill requests queue")
    public ResponseEntity<List<RefillRequest>> getPendingRefills() {
        return ResponseEntity.ok(doctorService.getPendingRefills());
    }

    @PostMapping("/me/refills/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Respond to refill request (approve or request visit)")
    public ResponseEntity<ApiResponse> respondRefill(
            @PathVariable("id") Long id,
            @RequestBody RefillActionRequest request) {
        ApiResponse response = doctorService.respondRefill(id, request.getAction(), request.getReason());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/reports")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get physician clinical and AI quality analytics reports")
    public ResponseEntity<Map<String, Object>> getReports(@RequestParam(value = "timeframe", defaultValue = "30d") String timeframe) {
        return ResponseEntity.ok(doctorService.getReports(timeframe));
    }

    @GetMapping("/me/settings")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get physician profile, AI preferences, and notification configuration")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(doctorService.getSettings());
    }

    @PutMapping("/me/settings")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Update physician configuration")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody Map<String, Object> settings) {
        return ResponseEntity.ok(doctorService.updateSettings(settings));
    }
}
