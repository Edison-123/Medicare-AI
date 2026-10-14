package com.medicare.controller;

import com.medicare.dto.ApiResponse;
import com.medicare.dto.VitalLogRequest;
import com.medicare.dto.UpdateProfileRequest;
import com.medicare.dto.AddReminderRequest;
import com.medicare.dto.BookAppointmentRequest;
import com.medicare.entity.*;
import com.medicare.service.PatientService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/patient")
@Tag(name = "Patient Portal", description = "Endpoints for patient health status, vitals, renewals, and reminders")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get Patient health dashboard metrics, vitals, and reminders")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(patientService.getDashboard());
    }

    @PostMapping("/vitals/log")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Log home patient vitals including BP, heart rate, SpO2, glucose, and weight")
    public ResponseEntity<ApiResponse> logVital(@RequestBody VitalLogRequest request) {
        return ResponseEntity.ok(patientService.logVital(request));
    }

    @PostMapping("/prescriptions/{id}/refill")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Submit refill renewal request to attending physician")
    public ResponseEntity<ApiResponse> requestRefill(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.get("notes") : "";
        return ResponseEntity.ok(patientService.requestRefill(id, notes));
    }

    @GetMapping("/prescriptions")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get patient prescriptions")
    public ResponseEntity<List<Prescription>> getPrescriptions(
            @RequestParam(value = "status", defaultValue = "All") String status,
            @RequestParam(value = "q", defaultValue = "") String q) {
        return ResponseEntity.ok(patientService.getPrescriptions(status, q));
    }

    @GetMapping("/visit-summaries")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get chronological doctor visit summaries & aftercare steps")
    public ResponseEntity<List<Consultation>> getVisitSummaries() {
        return ResponseEntity.ok(patientService.getVisitSummaries());
    }

    @GetMapping("/reminders")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get daily medicine reminders")
    public ResponseEntity<List<MedicineReminder>> getReminders() {
        return ResponseEntity.ok(patientService.getReminders());
    }

    @PostMapping("/reminders/{id}/toggle")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Toggle reminder taken status and update adherence streak")
    public ResponseEntity<MedicineReminder> toggleReminder(@PathVariable("id") Long id) {
        return ResponseEntity.ok(patientService.toggleReminder(id));
    }

    @PostMapping("/reminders")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Add a new medicine reminder")
    public ResponseEntity<MedicineReminder> addReminder(@Valid @RequestBody AddReminderRequest reminder) {
        return ResponseEntity.ok(patientService.addReminder(reminder));
    }

    @GetMapping("/medical-records")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get patient medical records, allergies, chronic conditions, and documents")
    public ResponseEntity<Map<String, Object>> getMedicalRecords() {
        return ResponseEntity.ok(patientService.getMedicalRecords());
    }

    @PostMapping("/allergies")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Add allergy record")
    public ResponseEntity<Map<String, Object>> addAllergy(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(patientService.addAllergy(body));
    }

    @PostMapping("/conditions")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Add chronic condition record")
    public ResponseEntity<Map<String, Object>> addCondition(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(patientService.addCondition(body));
    }

    @PostMapping("/documents")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Upload patient document metadata")
    public ResponseEntity<Map<String, Object>> uploadDocument(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(patientService.uploadDocument(body));
    }

    @GetMapping("/lab-tests")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get lab tests history and pending bookings")
    public ResponseEntity<List<Map<String, Object>>> getLabTests() {
        return ResponseEntity.ok(patientService.getLabTests());
    }

    @PostMapping("/lab-tests/book")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Book lab diagnostic test")
    public ResponseEntity<Map<String, Object>> bookLabTest(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(patientService.bookLabTest(body));
    }

    @GetMapping("/messages")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get patient direct chat thread")
    public ResponseEntity<Map<String, Object>> getMessages() {
        return ResponseEntity.ok(patientService.getPatientMessages());
    }

    @PostMapping("/messages")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Send message in patient chat thread")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, String> body) {
        String text = body.getOrDefault("text", "");
        return ResponseEntity.ok(patientService.sendPatientMessage(text));
    }

    @GetMapping("/doctors")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get active doctors available for appointment booking")
    public ResponseEntity<List<Map<String, Object>>> getAvailableDoctors() {
        return ResponseEntity.ok(patientService.getAvailableDoctors());
    }

    @GetMapping("/appointments")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get patient scheduled appointments")
    public ResponseEntity<List<Appointment>> getAppointments() {
        return ResponseEntity.ok(patientService.getAppointments());
    }

    @PostMapping("/appointments")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Book clinic in-person appointment")
    public ResponseEntity<Appointment> bookAppointment(@Valid @RequestBody BookAppointmentRequest appointment) {
        return ResponseEntity.ok(patientService.bookAppointment(appointment));
    }

    @PostMapping("/appointments/{id}/cancel")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Cancel an appointment")
    public ResponseEntity<ApiResponse> cancelAppointment(@PathVariable("id") Long id) {
        return ResponseEntity.ok(patientService.cancelAppointment(id));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get patient profile")
    public ResponseEntity<Patient> getProfile() {
        return ResponseEntity.ok(patientService.getProfile());
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Update patient profile")
    public ResponseEntity<Patient> updateProfile(@Valid @RequestBody UpdateProfileRequest patient) {
        return ResponseEntity.ok(patientService.updateProfile(patient));
    }

    @GetMapping("/settings")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get patient preferences and privacy settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(patientService.getSettings());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Update patient preferences and privacy settings")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody Map<String, Object> settings) {
        return ResponseEntity.ok(patientService.updateSettings(settings));
    }
}
