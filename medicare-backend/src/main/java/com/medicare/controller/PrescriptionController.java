package com.medicare.controller;

import com.medicare.entity.Doctor;
import com.medicare.entity.Consultation;
import com.medicare.entity.Patient;
import com.medicare.entity.Prescription;
import com.medicare.entity.PrescriptionItem;
import com.medicare.entity.Role;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.UserRepository;
import com.medicare.security.AuthorizationService;
import com.medicare.security.CurrentUserService;
import com.medicare.service.UserSettingsService;
import com.medicare.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/prescriptions")
@Tag(name = "Prescriptions", description = "Prescription authoring, transitions, and certified issuing")
public class PrescriptionController {

    private static final int DEFAULT_FOLLOW_UP_DAYS = 14;
    private static final String DEFAULT_PRESCRIPTION_NOTES = "Take medications strictly as instructed and report adverse reactions.";

    private final PrescriptionRepository prescriptionRepository;
    private final ConsultationRepository consultationRepository;
    private final NotificationService notificationService;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final AuthorizationService authorizationService;
    private final UserSettingsService userSettingsService;

    public PrescriptionController(PrescriptionRepository prescriptionRepository,
            ConsultationRepository consultationRepository,
            NotificationService notificationService,
            PatientRepository patientRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            AuthorizationService authorizationService,
            UserSettingsService userSettingsService) {
        this.prescriptionRepository = prescriptionRepository;
        this.consultationRepository = consultationRepository;
        this.notificationService = notificationService;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.authorizationService = authorizationService;
        this.userSettingsService = userSettingsService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PATIENT')")
    @Operation(summary = "List prescriptions visible to the authenticated user")
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(value = "q", defaultValue = "") String q,
            @RequestParam(value = "status", defaultValue = "All") String status,
            @RequestParam(value = "from", defaultValue = "") String from,
            @RequestParam(value = "to", defaultValue = "") String to,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        if (page < 1 || size < 1 || size > 100) {
            throw new ValidationException("page must be >= 1 and size must be between 1 and 100");
        }

        LocalDate fromDate = parseDateFilter(from, "from");
        LocalDate toDate = parseDateFilter(to, "to");
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ValidationException("from date must be on or before to date");
        }

        Role role = currentUserService.getUser().getRole();
        List<Prescription> all;

        if (role == Role.ROLE_ADMIN) {
            all = prescriptionRepository.findAll();
        } else if (role == Role.ROLE_DOCTOR) {
            Doctor doctor = currentUserService.getCurrentDoctor();
            all = prescriptionRepository.findByDoctorId(doctor.getId());
        } else {
            Patient patient = currentUserService.getCurrentPatient();
            all = prescriptionRepository.findByPatientId(patient.getId());
        }

        String normalizedQuery = q.trim().toLowerCase();
        List<Prescription> filtered = all.stream()
                .sorted(Comparator.comparing(Prescription::getId,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .filter(p -> status.equalsIgnoreCase("All")
                        || (p.getStatus() != null && p.getStatus().equalsIgnoreCase(status)))
                .filter(p -> isWithinDateRange(p.getDate(), fromDate, toDate))
                .filter(p -> normalizedQuery.isBlank()
                        || ((safe(p.getPatient()) + safe(p.getCode()) + safe(p.getDiagnosis()))
                                .toLowerCase().contains(normalizedQuery)))
                .toList();

        int start = Math.max(0, (page - 1) * size);
        int end = Math.min(filtered.size(), start + size);
        List<Prescription> items = start < filtered.size()
                ? filtered.subList(start, end)
                : Collections.emptyList();
        items.forEach(prescription -> patientRepository.findById(prescription.getPatientId())
                .ifPresent(patient -> prescription.setProfilePicture(patient.getProfilePicture())));

        Map<String, Object> res = new HashMap<>();
        res.put("total", filtered.size());
        res.put("items", items);
        return ResponseEntity.ok(res);
    }

    private LocalDate parseDateFilter(String value, String parameter) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ValidationException(parameter + " must be a valid date in YYYY-MM-DD format");
        }
    }

    private boolean isWithinDateRange(String value, LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return true;
        }
        if (value == null || value.isBlank()) {
            return false;
        }
        try {
            LocalDate date = LocalDate.parse(value);
            return (from == null || !date.isBefore(from)) && (to == null || !date.isAfter(to));
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Get prescription by ID")
    public ResponseEntity<Prescription> get(@PathVariable Long id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Prescription not found"));

        authorizationService.checkPrescriptionAccess(prescription);
        return ResponseEntity.ok(prescription);
    }

    private synchronized String generateUniqueRxCode() {
        long base = 1000 + prescriptionRepository.findTopByOrderByIdDesc().map(p -> p.getId() + 1)
                .orElse(prescriptionRepository.count() + 1);
        String code = "RX-" + base;
        int suffix = 1;
        while (prescriptionRepository.existsByCode(code)) {
            code = "RX-" + (base + suffix++);
        }
        return code;
    }

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    @Transactional
    @Operation(summary = "Create new electronic prescription")
    public ResponseEntity<Prescription> create(@RequestBody Prescription rx) {
        Doctor doctor = currentUserService.getCurrentDoctor();
        authorizationService.checkDoctorIsActive(doctor);

        if (rx.getPatientId() == null) {
            throw new ValidationException("Patient is required");
        }

        Patient patient = patientRepository.findById(rx.getPatientId())
                .orElseThrow(() -> new NotFoundException("Patient not found"));

        rx.setDoctorId(doctor.getId());
        rx.setDoctor(doctor.getName());
        rx.setPatientId(patient.getId());
        rx.setPatient(patient.getName());
        rx.setCode(generateUniqueRxCode());
        rx.setStatus("Draft");
        rx.setDate(LocalDate.now().toString());
        applyDoctorDefaults(rx);
        if (rx.getRefillsLeft() == null)
            rx.setRefillsLeft(3);
        rx.setQrVerification(null);

        if (rx.getItems() != null) {
            rx.getItems().forEach(item -> item.setPrescription(rx));
        }

        return ResponseEntity.ok(prescriptionRepository.save(rx));
    }

    @PostMapping("/from-consultation/{consultationId}/draft")
    @PreAuthorize("hasRole('DOCTOR')")
    @Transactional
    @Operation(summary = "Create or return a consultation's medication draft")
    public ResponseEntity<Prescription> createFromConsultation(
            @PathVariable Long consultationId,
            @RequestBody Map<String, Object> body) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new NotFoundException("Consultation not found"));
        authorizationService.checkDoctorOwnsConsultation(consultation);
        if (!"Completed".equalsIgnoreCase(consultation.getStatus())) {
            throw new ValidationException("Complete the consultation before creating its prescription");
        }
        if (consultation.getPrescriptionId() != null) {
            Prescription existing = prescriptionRepository.findById(consultation.getPrescriptionId())
                    .orElseThrow(() -> new NotFoundException("Linked prescription not found"));
            authorizationService.checkDoctorOwnsPrescription(existing);
            return ResponseEntity.ok(existing);
        }

        String medications = Objects.toString(body.get("medications"), "").trim();
        if (medications.isBlank()) {
            throw new ValidationException("Add at least one prescribed medication");
        }

        Prescription draft = new Prescription();
        draft.setPatientId(consultation.getPatientId());
        draft.setDiagnosis(Objects.toString(body.get("diagnosis"), ""));
        draft.setNotes(Objects.toString(body.get("notes"), ""));
        ResponseEntity<Prescription> created = create(draft);
        Prescription saved = created.getBody();
        if (saved == null) {
            throw new IllegalStateException("Prescription draft could not be created");
        }
        consultation.setPrescriptionId(saved.getId());
        consultationRepository.save(consultation);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Transactional
    @Operation(summary = "Update prescription draft")
    public ResponseEntity<Prescription> update(@PathVariable Long id,
            @RequestBody Prescription updated) {
        Prescription rx = prescriptionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Prescription not found"));

        authorizationService.checkDoctorOwnsPrescription(rx);

        if ("Finalized".equalsIgnoreCase(rx.getStatus())) {
            throw new ValidationException("Finalized prescriptions are cryptographically sealed and immutable");
        }

        rx.setDiagnosis(updated.getDiagnosis());
        rx.setNotes(updated.getNotes());
        rx.setFollowUp(updated.getFollowUp());
        rx.setStatus("Draft");

        rx.getItems().clear();
        if (updated.getItems() != null) {
            for (PrescriptionItem item : updated.getItems()) {
                item.setId(null);
                item.setPrescription(rx);
                rx.getItems().add(item);
            }
        }

        return ResponseEntity.ok(prescriptionRepository.save(rx));
    }

    @PostMapping("/{id}/{action}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Transactional
    @Operation(summary = "Transition prescription status (approve, finalize, cancel)")
    public ResponseEntity<Prescription> transition(@PathVariable Long id,
            @PathVariable String action) {
        Prescription rx = prescriptionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Prescription not found"));

        authorizationService.checkDoctorOwnsPrescription(rx);

        if ("approve".equalsIgnoreCase(action)) {
            if (!"Draft".equalsIgnoreCase(rx.getStatus())) {
                throw new ValidationException("Only Draft prescriptions can be approved");
            }
            validateForReview(rx);
            validateAgainstPatientAllergies(rx);
            rx.setStatus("Reviewed");

        } else if ("finalize".equalsIgnoreCase(action)) {
            if (!"Reviewed".equalsIgnoreCase(rx.getStatus())) {
                throw new ValidationException("Only Reviewed prescriptions can be finalized");
            }
            rx.setStatus("Finalized");
            String dataToSign = String.join("|",
                    String.valueOf(rx.getCode()),
                    String.valueOf(rx.getDoctorId()),
                    String.valueOf(rx.getPatientId()),
                    String.valueOf(rx.getDate()),
                    String.valueOf(rx.getDiagnosis()),
                    "Finalized");
            rx.setQrVerification("MEDICARE-SIG-" + sha256Hex(dataToSign).substring(0, 16).toUpperCase(Locale.ROOT));

            if (rx.getPatientId() == null) {
                throw new ValidationException("Prescription has no patient");
            }

            Doctor doctor = currentUserService.getCurrentDoctor();
            Patient patient = patientRepository.findById(rx.getPatientId())
                    .orElseThrow(() -> new NotFoundException("Patient not found"));
            Long patientUserId = userRepository.findByEmailIgnoreCase(patient.getEmail())
                    .map(com.medicare.entity.User::getId)
                    .orElseThrow(() -> new NotFoundException("Patient user account not found"));
            notificationService.createNotification(new com.medicare.entity.Notification(
                    "patient",
                    patientUserId,
                    "Prescription Finalized & Certified",
                    doctor.getName() + " has finalized prescription " + rx.getCode()
                            + ". Digital verification QR attached.",
                    "/patient/prescriptions",
                    "Just now",
                    true));

        } else if ("cancel".equalsIgnoreCase(action)) {
            if ("Finalized".equalsIgnoreCase(rx.getStatus())) {
                throw new ValidationException("Finalized prescriptions cannot be cancelled");
            }
            rx.setStatus("Cancelled");

        } else {
            throw new ValidationException("Unsupported prescription action: " + action);
        }

        return ResponseEntity.ok(prescriptionRepository.save(rx));
    }

    private String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                out.append(String.format("%02x", b));
            }
            return out.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private void validateForReview(Prescription rx) {
        if (rx.getDiagnosis() == null || rx.getDiagnosis().isBlank()) {
            throw new ValidationException("Diagnosis is required before approval");
        }
        if (rx.getPatientId() == null) {
            throw new ValidationException("Patient is required before approval");
        }
        if (rx.getItems() == null || rx.getItems().isEmpty()) {
            throw new ValidationException("At least one medicine is required before approval");
        }

        for (PrescriptionItem item : rx.getItems()) {
            if (item.getName() == null || item.getName().isBlank()) {
                throw new ValidationException("Medicine name is required");
            }
            if (item.getDosage() == null || item.getDosage().isBlank()) {
                throw new ValidationException("Medicine dosage is required for " + item.getName());
            }
            if (item.getFrequency() == null || item.getFrequency().isBlank()) {
                throw new ValidationException("Medicine frequency is required for " + item.getName());
            }
            if (item.getDuration() == null || item.getDuration().isBlank()) {
                throw new ValidationException("Medicine duration is required for " + item.getName());
            }
        }
    }

    private void applyDoctorDefaults(Prescription prescription) {
        Long userId = currentUserService.getUser().getId();
        if (prescription.getNotes() == null || prescription.getNotes().isBlank()) {
            Object configuredNotes = userSettingsService.getSetting(userId, "doctor", "preferences", "defaultRxNotes");
            prescription.setNotes(configuredNotes instanceof String notes && !notes.isBlank()
                    ? notes.trim()
                    : DEFAULT_PRESCRIPTION_NOTES);
        }
        if (prescription.getFollowUp() == null || prescription.getFollowUp().isBlank()) {
            Object configuredDays = userSettingsService.getSetting(userId, "doctor", "preferences",
                    "defaultFollowUpDays");
            int days = configuredDays instanceof Number value ? value.intValue() : DEFAULT_FOLLOW_UP_DAYS;
            if (days < 1 || days > 365) {
                days = DEFAULT_FOLLOW_UP_DAYS;
            }
            prescription.setFollowUp(LocalDate.now().plusDays(days).toString());
        }
    }

    private void validateAgainstPatientAllergies(Prescription prescription) {
        Object configured = userSettingsService.getSetting(currentUserService.getUser().getId(), "doctor",
                "preferences",
                "strictAllergyChecks");
        if (configured instanceof Boolean enabled && !enabled) {
            return;
        }

        Patient patient = patientRepository.findById(prescription.getPatientId())
                .orElseThrow(() -> new NotFoundException("Patient not found"));
        List<String> allergies = patient.getAllergies();
        if (allergies == null) {
            return;
        }
        for (PrescriptionItem item : prescription.getItems()) {
            String medicine = safe(item.getName()).toLowerCase(Locale.ROOT);
            for (String allergy : allergies) {
                if (allergy != null && !allergy.isBlank()
                        && medicine.contains(allergy.trim().toLowerCase(Locale.ROOT))) {
                    throw new ValidationException("Medicine " + item.getName()
                            + " matches the patient's recorded allergy: " + allergy);
                }
            }
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
