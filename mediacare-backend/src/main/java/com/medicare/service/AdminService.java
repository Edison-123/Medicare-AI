package com.medicare.service;

import com.medicare.dto.ApiResponse;
import com.medicare.dto.AdminCreatePatientRequest;
import com.medicare.dto.PatientRegistrationResponse;
import com.medicare.security.CurrentUserService;
import com.medicare.entity.*;
import com.medicare.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.env.Environment;
import com.medicare.exception.ValidationException;

import java.util.*;

@Service
public class AdminService {

    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final HospitalRepository hospitalRepository;
    private final SystemLogRepository systemLogRepository;
    private final com.medicare.repository.UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PrescriptionRepository prescriptionRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final UserSettingsService userSettingsService;
    private final CurrentUserService currentUserService;
    private final Environment environment;

    public AdminService(DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            HospitalRepository hospitalRepository,
            SystemLogRepository systemLogRepository,
            com.medicare.repository.UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PrescriptionRepository prescriptionRepository,
            AppointmentRepository appointmentRepository,
            ConsultationRepository consultationRepository,
            UserSettingsService userSettingsService,
            CurrentUserService currentUserService,
            Environment environment) {
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.hospitalRepository = hospitalRepository;
        this.systemLogRepository = systemLogRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.prescriptionRepository = prescriptionRepository;
        this.appointmentRepository = appointmentRepository;
        this.consultationRepository = consultationRepository;
        this.userSettingsService = userSettingsService;
        this.currentUserService = currentUserService;
        this.environment = environment;
    }

    public Map<String, Object> getDashboard() {
        Map<String, Object> map = new LinkedHashMap<>();
        long doctorCount = doctorRepository.count();
        long patientCount = patientRepository.count();
        long hospitalCount = hospitalRepository.count();
        long rxCount = prescriptionRepository.count();
        long consultationCount = consultationRepository.count();

        map.put("kpis", List.of(
                Map.of("key", "doctors", "label", "Registered Doctors", "value", doctorCount, "delta",
                        "Database records", "tone", "blue"),
                Map.of("key", "patients", "label", "Active Patients", "value",
                        patientRepository.findAll().stream().filter(p -> "Active".equalsIgnoreCase(p.getStatus()))
                                .count(),
                        "delta", "Database records", "tone", "green"),
                Map.of("key", "hospitals", "label", "Partner Hospitals", "value", hospitalCount, "delta",
                        "Database records", "tone", "purple"),
                Map.of("key", "prescriptions", "label", "Prescriptions Issued", "value", rxCount, "delta",
                        "Database records", "tone", "orange")));
        map.put("systemHealth", Map.of(
                "uptime", "Not measured",
                "apiLatencyMs", 0,
                "aiInferenceSec", 0,
                "dbConnections", "Managed by datasource pool",
                "storageUsedPercent", 0,
                "status", "Operational"));

        List<Map<String, Object>> hospitalDistribution = hospitalRepository.findAll().stream().map(hospital -> {
            long consults = appointmentRepository.findAll().stream()
                    .filter(a -> Objects.equals(a.getHospital(), hospital.getName()))
                    .count();
            long share = consultationCount == 0 ? 0 : Math.round(consults * 100.0 / consultationCount);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", hospital.getName());
            item.put("code", hospital.getCode());
            item.put("consults", consults);
            item.put("share", share);
            item.put("status", hospital.getStatus() != null ? hospital.getStatus() : "Unknown");
            return item;
        }).toList();
        map.put("hospitalDistribution", hospitalDistribution);

        List<SystemLog> logs = systemLogRepository.findAllByOrderByTimestampDesc();
        map.put("recentActivities", logs.stream().limit(5).map(log -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", log.getId());
            item.put("type", log.getComponent());
            item.put("level", log.getLevel());
            item.put("title", log.getMessage());
            item.put("desc", log.getMessage());
            item.put("time", log.getTimestamp());
            return item;
        }).toList());
        map.put("pendingDoctorApprovals", doctorRepository.findByStatus("Pending").stream().map(d -> Map.of(
                "id", d.getId(), "name", d.getName(), "email", d.getEmail(), "specialization", d.getSpecialization(),
                "license", d.getLicenseNumber(), "hospital", d.getHospital(), "submitted", "Not recorded")).toList());
        return map;
    }

    public List<Doctor> getDoctors() {
        return doctorRepository.findAll();
    }

    @Transactional
    public Doctor addDoctor(Doctor doc) {
        if (doc.getEmail() == null || doc.getEmail().isBlank()) {
            throw new ValidationException("Doctor email is required");
        }
        String email = doc.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ValidationException("A user with this email already exists");
        }
        if (doctorRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ValidationException("A doctor with this email already exists");
        }

        if (doc.getStatus() == null)
            doc.setStatus("Active");
        if (doc.getRating() == null)
            doc.setRating(5.0);
        doc.setEmail(email);

        String seedPassword = environment.getRequiredProperty("SEED_USER_PASSWORD");
        if (seedPassword.isBlank()) {
            throw new ValidationException("SEED_USER_PASSWORD must be configured before adding a doctor");
        }

        User user = new User(
                email,
                passwordEncoder.encode(seedPassword),
                doc.getName() != null ? doc.getName().trim() : "Doctor",
                "Doctor",
                Role.ROLE_DOCTOR);
        userRepository.save(user);

        return doctorRepository.save(doc);
    }

    public Doctor updateDoctorStatus(Long id, String status) {
        Doctor doc = doctorRepository.findById(id).orElseThrow(() -> new RuntimeException("Doctor not found"));
        doc.setStatus(status);
        return doctorRepository.save(doc);
    }

    public List<Patient> getPatients() {
        return patientRepository.findAll();
    }

    @Transactional
    public PatientRegistrationResponse registerPatient(AdminCreatePatientRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ValidationException("A user with this email already exists");
        }

        if (patientRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ValidationException("A patient with this email already exists");
        }

        String status = request.getStatus() == null || request.getStatus().isBlank()
                ? "Active"
                : request.getStatus().trim();

        User user = new User(
                email,
                passwordEncoder.encode(request.getPassword()),
                request.getName().trim(),
                "Patient",
                Role.ROLE_PATIENT);
        user = userRepository.save(user);

        Patient patient = new Patient();
        patient.setName(request.getName().trim());
        patient.setEmail(email);
        patient.setPhone(request.getPhone());
        patient.setDob(request.getDob());
        patient.setAge(request.getAge());
        patient.setGender(request.getGender());
        patient.setBloodGroup(request.getBloodGroup());
        patient.setHeightCm(request.getHeightCm());
        patient.setWeightKg(request.getWeightKg());
        patient.setBmi(request.getBmi());
        patient.setAddress(request.getAddress());
        patient.setHealthCardNumber(request.getHealthCardNumber());
        patient.setInsuranceProvider(request.getInsuranceProvider());
        patient.setInsurancePolicy(request.getInsurancePolicy());
        patient.setRiskCategory(request.getRiskCategory());
        patient.setStatus(status);
        patient.setHospital(request.getHospital());
        patient.setPrimaryDoctor(request.getPrimaryDoctor());
        patient = patientRepository.save(patient);

        return new PatientRegistrationResponse(
                user.getId(),
                patient.getId(),
                patient.getName(),
                patient.getEmail(),
                Role.ROLE_PATIENT.name(),
                patient.getStatus(),
                "Patient registered successfully");
    }

    public Patient updatePatientStatus(Long id, String status) {
        Patient patient = patientRepository.findById(id).orElseThrow(() -> new RuntimeException("Patient not found"));
        patient.setStatus(status);
        return patientRepository.save(patient);
    }

    public List<Hospital> getHospitals() {
        return hospitalRepository.findAll();
    }

    public Hospital addHospital(Hospital hospital) {
        if (hospital.getStatus() == null)
            hospital.setStatus("Active");
        if (hospital.getApiStatus() == null)
            hospital.setApiStatus("Online (28ms)");
        return hospitalRepository.save(hospital);
    }

    public List<Map<String, Object>> getPrescriptionsAudit() {
        return prescriptionRepository.findAll().stream().map(rx -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rx.getId());
            m.put("code", rx.getCode());
            m.put("doctor", rx.getDoctor());
            m.put("patient", rx.getPatient());
            m.put("hospital", rx.getHospital());
            m.put("date", rx.getDate());
            m.put("diagnosis", rx.getDiagnosis());
            m.put("medsCount", rx.getItems() != null ? rx.getItems().size() : 0);
            boolean aiWarning = rx.getNotes() != null && rx.getNotes().toLowerCase(Locale.ROOT).contains("warning");
            m.put("aiAssisted", aiWarning);
            m.put("safetyFlag", aiWarning ? rx.getNotes() : "Verified Safe");
            m.put("status", rx.getStatus());
            m.put("auditHash", rx.getQrVerification());
            return m;
        }).toList();
    }

    public Map<String, Object> getReports() {
        long completed = consultationRepository.findAll().stream()
                .filter(c -> "Completed".equalsIgnoreCase(c.getStatus())).count();
        long aiAssisted = consultationRepository.findAll().stream()
                .filter(c -> c.getAiStateJson() != null && !c.getAiStateJson().isBlank()).count();
        long allergyAlerts = prescriptionRepository.findAll().stream()
                .filter(p -> p.getNotes() != null && p.getNotes().toLowerCase(Locale.ROOT).contains("warning")).count();
        long totalConsults = consultationRepository.count();
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("summary", Map.of(
                "totalPatients", patientRepository.count(),
                "consultationsCompleted", completed,
                "prescriptionsIssued", prescriptionRepository.count(),
                "aiAdoptionRate", totalConsults == 0 ? 0 : Math.round(aiAssisted * 1000.0 / totalConsults) / 10.0,
                "avgConsultTimeMinutes", 0,
                "allergyAlertsAvoided", allergyAlerts));
        res.put("kpis", List.of(
                Map.of("key", "doctors", "label", "Registered Doctors", "value", doctorRepository.count(), "delta",
                        "Database records", "tone", "blue"),
                Map.of("key", "patients", "label", "Active Patients", "value",
                        patientRepository.findAll().stream().filter(p -> "Active".equalsIgnoreCase(p.getStatus()))
                                .count(),
                        "delta", "Database records", "tone", "green"),
                Map.of("key", "hospitals", "label", "Partner Hospitals", "value", hospitalRepository.count(), "delta",
                        "Database records", "tone", "purple")));
        res.put("systemHealth", Map.of(
                "uptime", "Not measured", "apiLatencyMs", 0, "aiInferenceSec", 0,
                "dbConnections", "Managed by datasource pool", "storageUsedPercent", 0, "status", "Operational"));
        res.put("hospitalDistribution", hospitalRepository.findAll().stream().map(h -> {
            long consults = appointmentRepository.findAll().stream()
                    .filter(a -> Objects.equals(a.getHospital(), h.getName())).count();
            long share = totalConsults == 0 ? 0 : Math.round(consults * 100.0 / totalConsults);
            return Map.of("name", h.getName(), "code", h.getCode(), "consults", consults, "share", share, "status",
                    h.getStatus() != null ? h.getStatus() : "Unknown");
        }).toList());
        return res;
    }

    private Map<String, Object> defaultSettings() {
        return new HashMap<>(Map.of(
                "general", new HashMap<>(Map.of(
                        "platformName", "MediCare AI Enterprise Health Platform", "maintenanceMode", false,
                        "environment", "Configured by deployment", "dataRetentionYears", 7, "supportEmail", "")),
                "aiEngine", new HashMap<>(Map.of(
                        "primaryModel", "Configured by environment", "ocrEngine", "Provider not configured",
                        "confidenceThresholdPercent", 92, "enforceAllergyCheck", true, "enforceInteractionCheck", true,
                        "requireDoctorSignature", true)),
                "security", new HashMap<>(Map.of(
                        "sessionTimeoutMinutes", 30, "maxFailedLogins", 5, "lockoutDurationMinutes", 15, "enforce2FA",
                        false, "ipAllowlistEnabled", false)),
                "integrations", new HashMap<>(Map.of(
                        "hl7FhirEndpoint", "", "apiKeySecretMasked", "Not configured", "webhookStatus",
                        "Not configured"))));
    }

    public Map<String, Object> getSettings() {
        return userSettingsService.getOrCreate(currentUserService.getUser().getId(), "admin", defaultSettings());
    }

    public Map<String, Object> updateSettings(Map<String, Object> updated) {
        return userSettingsService.replace(currentUserService.getUser().getId(), "admin", updated, defaultSettings());
    }

    public List<SystemLog> getSystemLogs() {
        return systemLogRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional
    public ApiResponse clearLogs() {
        long count = systemLogRepository.count();
        systemLogRepository.deleteAll();
        systemLogRepository.save(new SystemLog(
                "WARN",
                "AUDIT",
                "admin@medicare.ai",
                "All previous " + count + " audit logs were purged by Administrator.",
                "127.0.0.1",
                java.time.LocalDateTime.now().toString()));
        return new ApiResponse(true, "System audit logs cleared and purge event recorded");
    }
}
