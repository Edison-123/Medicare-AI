package com.medicare.controller;

import com.medicare.dto.ApiResponse;
import com.medicare.dto.AdminCreatePatientRequest;
import com.medicare.dto.PatientRegistrationResponse;
import com.medicare.entity.*;
import com.medicare.service.AdminService;
import com.medicare.service.ProfilePictureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@Tag(name = "Admin Portal", description = "Endpoints for administrator analytics, doctors, and system logs")
public class AdminController {

    private final AdminService adminService;
    private final ProfilePictureService profilePictureService;

    public AdminController(AdminService adminService, ProfilePictureService profilePictureService) {
        this.adminService = adminService;
        this.profilePictureService = profilePictureService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system-wide KPIs and platform overview")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboard());
    }

    @GetMapping("/doctors")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get registered doctors list")
    public ResponseEntity<List<Doctor>> getDoctors(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "All") String department,
            @RequestParam(defaultValue = "All") String status) {
        List<Doctor> doctors = adminService.getDoctors(q, department, status);
        profilePictureService.populateDoctorPictures(doctors);
        return ResponseEntity.ok(doctors);
    }

    @PostMapping("/doctors")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add or onboard a doctor")
    public ResponseEntity<Doctor> addDoctor(@RequestBody Doctor doctor) {
        return ResponseEntity.ok(adminService.addDoctor(doctor));
    }

    @PutMapping("/doctors/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update doctor profile details")
    public ResponseEntity<Doctor> updateDoctor(@PathVariable("id") Long id, @RequestBody Doctor doctor) {
        return ResponseEntity.ok(adminService.updateDoctor(id, doctor));
    }

    @PutMapping("/doctors/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update doctor status (Active, Suspended, etc.)")
    public ResponseEntity<Doctor> updateDoctorStatus(@PathVariable("id") Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "Active");
        return ResponseEntity.ok(adminService.updateDoctorStatus(id, status));
    }

    @GetMapping("/patients")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get master patients directory")
    public ResponseEntity<List<Patient>> getPatients(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "All") String hospital,
            @RequestParam(name = "riskCategory", required = false) String riskCategory,
            @RequestParam(name = "risk", required = false) String risk) {
        String effectiveRisk = (riskCategory != null && !riskCategory.isBlank()) ? riskCategory
                : (risk != null && !risk.isBlank() ? risk : "All");
        List<Patient> patients = adminService.getPatients(q, hospital, effectiveRisk);
        profilePictureService.populatePatientPictures(patients);
        return ResponseEntity.ok(patients);
    }

    @PostMapping("/patients")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Register a new patient and create the patient login account")
    public ResponseEntity<PatientRegistrationResponse> registerPatient(
            @Valid @RequestBody AdminCreatePatientRequest request) {
        return ResponseEntity.status(201).body(adminService.registerPatient(request));
    }

    @PutMapping("/patients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update patient profile details")
    public ResponseEntity<Patient> updatePatient(@PathVariable("id") Long id, @RequestBody Patient patient) {
        return ResponseEntity.ok(adminService.updatePatient(id, patient));
    }

    @PutMapping("/patients/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update patient status")
    public ResponseEntity<Patient> updatePatientStatus(@PathVariable("id") Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "Active");
        return ResponseEntity.ok(adminService.updatePatientStatus(id, status));
    }

    @GetMapping("/hospitals")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get hospital network directory")
    public ResponseEntity<List<Hospital>> getHospitals(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "All") String status) {
        return ResponseEntity.ok(adminService.getHospitals(q, status));
    }

    @PostMapping("/hospitals")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Register partner hospital")
    public ResponseEntity<Hospital> addHospital(@RequestBody Hospital hospital) {
        return ResponseEntity.ok(adminService.addHospital(hospital));
    }

    @PutMapping("/hospitals/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update partner hospital details")
    public ResponseEntity<Hospital> updateHospital(@PathVariable("id") Long id, @RequestBody Hospital hospital) {
        return ResponseEntity.ok(adminService.updateHospital(id, hospital));
    }

    @DeleteMapping("/hospitals/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a hospital and deactivate its assigned doctors and patients")
    public ResponseEntity<ApiResponse> deleteHospital(@PathVariable("id") Long id) {
        return ResponseEntity.ok(adminService.deleteHospital(id));
    }

    @GetMapping("/prescriptions-audit")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get compliance and cryptographic prescription audit trail")
    public ResponseEntity<List<Map<String, Object>>> getPrescriptionsAudit(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "All") String flag,
            @RequestParam(defaultValue = "All") String status) {
        return ResponseEntity.ok(adminService.getPrescriptionsAudit(q, flag, status));
    }

    @GetMapping("/reports")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform-wide analytics and compliance KPIs")
    public ResponseEntity<Map<String, Object>> getReports(
            @RequestParam(defaultValue = "30d") String timeframe) {
        return ResponseEntity.ok(adminService.getReports(timeframe));
    }

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform governance and engine configuration")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(adminService.getSettings());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update platform governance and configuration")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody Map<String, Object> settings) {
        return ResponseEntity.ok(adminService.updateSettings(settings));
    }

    @GetMapping("/system-logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get security and system audit logs")
    public ResponseEntity<List<SystemLog>> getSystemLogs(
            @RequestParam(defaultValue = "All") String level,
            @RequestParam(defaultValue = "All") String component,
            @RequestParam(defaultValue = "") String q) {
        return ResponseEntity.ok(adminService.getSystemLogs(level, component, q));
    }

    @PostMapping("/system-logs/clear")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Clear audit logs")
    public ResponseEntity<ApiResponse> clearLogs() {
        return ResponseEntity.ok(adminService.clearLogs());
    }
}
