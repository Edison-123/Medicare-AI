package com.medicare.service;

import com.medicare.dto.ApiResponse;
import com.medicare.entity.*;
import com.medicare.repository.*;
import com.medicare.security.CurrentUserService;
import com.medicare.exception.ForbiddenException;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DoctorService {

        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final RefillRequestRepository refillRequestRepository;
        private final PrescriptionRepository prescriptionRepository;
        private final AppointmentRepository appointmentRepository;
        private final NotificationService notificationService;
        private final AiAccuracyMetricsService aiAccuracyMetricsService;
        private final ConsultationRepository consultationRepository;
        private final UserSettingsService userSettingsService;
        private final CurrentUserService currentUserService;
        private final UserRepository userRepository;

        public DoctorService(DoctorRepository doctorRepository,
                        PatientRepository patientRepository,
                        RefillRequestRepository refillRequestRepository,
                        PrescriptionRepository prescriptionRepository,
                        AppointmentRepository appointmentRepository,
                        NotificationService notificationService,
                        AiAccuracyMetricsService aiAccuracyMetricsService,
                        ConsultationRepository consultationRepository,
                        UserSettingsService userSettingsService,
                        CurrentUserService currentUserService,
                        UserRepository userRepository) {
                this.doctorRepository = doctorRepository;
                this.patientRepository = patientRepository;
                this.refillRequestRepository = refillRequestRepository;
                this.prescriptionRepository = prescriptionRepository;
                this.appointmentRepository = appointmentRepository;
                this.notificationService = notificationService;
                this.aiAccuracyMetricsService = aiAccuracyMetricsService;
                this.consultationRepository = consultationRepository;
                this.userSettingsService = userSettingsService;
                this.currentUserService = currentUserService;
                this.userRepository = userRepository;
        }

        public Map<String, Object> getDashboard() {
                Doctor doctor = currentUserService.getCurrentDoctor();
                List<Prescription> doctorRx = prescriptionRepository.findByDoctorId(doctor.getId());
                List<Appointment> doctorAppts = appointmentRepository.findByDoctorId(doctor.getId());
                List<com.medicare.entity.Consultation> doctorConsults = consultationRepository
                                .findByDoctorId(doctor.getId());

                long activePatientCount = patientRepository.findAll().stream()
                                .filter(patient -> "Active".equalsIgnoreCase(patient.getStatus()))
                                .count();
                long completedConsultations = doctorConsults.stream()
                                .filter(c -> "Completed".equalsIgnoreCase(c.getStatus()))
                                .count();
                long aiAssisted = doctorConsults.stream()
                                .filter(c -> c.getAiStateJson() != null && !c.getAiStateJson().isBlank()).count();
                long followUpsDue = doctorAppts.stream().filter(a -> "Scheduled".equalsIgnoreCase(a.getStatus()))
                                .count();

                List<Map<String, Object>> stats = List.of(
                                Map.of("key", "patients", "value", String.valueOf(activePatientCount), "label",
                                                "Active Patients", "tone", "blue"),
                                Map.of("key", "rx", "value", String.valueOf(doctorRx.size()), "label",
                                                "Prescriptions Issued", "tone", "green"),
                                Map.of("key", "ai", "value",
                                                doctorConsults.isEmpty() ? "0%"
                                                                : String.format(Locale.ROOT, "%.1f%%",
                                                                                (aiAssisted * 100.0) / doctorConsults
                                                                                                .size()),
                                                "label", "AI-Assisted Consultations", "delta",
                                                "Tracked from consultations", "tone", "purple"),
                                Map.of("key", "follow", "value", String.valueOf(followUpsDue), "label",
                                                "Follow-ups Due", "link",
                                                "View all", "tone", "orange"));

                Map<String, Object> dashboard = new LinkedHashMap<>();
                dashboard.put("stats", stats);
                LocalDate today = LocalDate.now();
                dashboard.put("appointments", doctorAppts.stream()
                                .filter(appointment -> today.equals(appointmentDate(appointment)))
                                .sorted(Comparator.comparing(this::appointmentDateTime,
                                                Comparator.nullsLast(Comparator.naturalOrder())))
                                .limit(5).map(a -> Map.of(
                                                "id", a.getId(),
                                                "patient", a.getPatient() != null ? a.getPatient() : "Patient",
                                                "profilePicture", patientProfilePicture(a.getPatientId()),
                                                "time", a.getTime() != null ? a.getTime() : "Not scheduled",
                                                "type", a.getType() != null ? a.getType() : "In-person OPD",
                                                "status", a.getStatus() != null ? a.getStatus() : "Scheduled"))
                                .toList());

                Map<String, Object> aiOverview = new LinkedHashMap<>();
                aiOverview.put("total", doctorConsults.size());
                aiOverview.put("accuracy", null);
                aiOverview.put("parts", List.of(
                                Map.of("label", "Consultations with AI state", "value", aiAssisted),
                                Map.of("label", "Consultations without AI state", "value",
                                                Math.max(0, doctorConsults.size() - aiAssisted))));
                dashboard.put("aiOverview", aiOverview);

                dashboard.put("recentRx", doctorRx.stream()
                                .sorted(Comparator.comparing(Prescription::getId, Comparator.nullsLast(Long::compareTo))
                                                .reversed())
                                .limit(5).map(rx -> Map.of(
                                                "id", rx.getId(),
                                                "patient", rx.getPatient() != null ? rx.getPatient() : "Patient",
                                                "profilePicture", patientProfilePicture(rx.getPatientId()),
                                                "when",
                                                (rx.getDate() != null ? rx.getDate() : "Recent") + " · " + rx.getCode(),
                                                "status", rx.getStatus() != null ? rx.getStatus() : "Draft"))
                                .toList());
                return dashboard;
        }

        public List<RefillRequest> getPendingRefills() {
                Doctor doctor = currentUserService.getCurrentDoctor();
                List<RefillRequest> requests = refillRequestRepository.findByStatus("Pending").stream()
                                .filter(req -> req.getPrescriptionId() != null)
                                .filter(req -> prescriptionRepository.findById(req.getPrescriptionId())
                                                .map(rx -> Objects.equals(rx.getDoctorId(), doctor.getId()))
                                                .orElse(false))
                                .sorted(Comparator.comparing(RefillRequest::getId,
                                                Comparator.nullsLast(Comparator.naturalOrder())))
                                .toList();
                requests.forEach(request -> request.setProfilePicture(patientProfilePicture(request.getPatientId())));
                return requests;
        }

        private String patientProfilePicture(Long patientId) {
                if (patientId == null) {
                        return "";
                }
                return patientRepository.findById(patientId)
                                .map(patient -> patient.getProfilePicture() == null ? "" : patient.getProfilePicture())
                                .orElse("");
        }

        private LocalDateTime appointmentDateTime(Appointment appointment) {
                try {
                        LocalDate date = appointmentDate(appointment);
                        if (date == null) {
                                return null;
                        }
                        LocalTime time = LocalTime.parse(appointment.getTime(),
                                        DateTimeFormatter.ofPattern("hh:mm a", Locale.US));
                        return date.atTime(time);
                } catch (Exception ignored) {
                        return null;
                }
        }

        private LocalDate appointmentDate(Appointment appointment) {
                try {
                        return LocalDate.parse(appointment.getDate());
                } catch (Exception ignored) {
                        return null;
                }
        }

        @org.springframework.transaction.annotation.Transactional
        public ApiResponse respondRefill(Long refillId, String action, String reason) {
                Doctor doctor = currentUserService.getCurrentDoctor();
                RefillRequest req = refillRequestRepository.findById(refillId)
                                .orElseThrow(() -> new NotFoundException("Refill request not found"));
                if (!"Pending".equalsIgnoreCase(req.getStatus())) {
                        throw new ValidationException("This refill request has already been processed");
                }
                Prescription prescription = prescriptionRepository.findById(req.getPrescriptionId())
                                .orElseThrow(() -> new NotFoundException("Prescription not found"));
                if (!Objects.equals(prescription.getDoctorId(), doctor.getId())) {
                        throw new ForbiddenException("You do not have access to this refill request");
                }

                if ("approve".equalsIgnoreCase(action)) {
                        int remaining = prescription.getRefillsLeft() == null ? 0 : prescription.getRefillsLeft();
                        if (remaining <= 0) {
                                throw new ValidationException("No authorized refills remain on this prescription");
                        }
                        prescription.setRefillsLeft(remaining - 1);
                        prescriptionRepository.save(prescription);
                        req.setStatus("Approved");
                        notificationService.createNotification(new Notification(
                                        "patient", patientUserId(req.getPatientId()), "Refill Request Approved",
                                        doctor.getName() + " approved your refill for " + req.getMedicine() + ". "
                                                        + (remaining - 1)
                                                        + " refill(s) remain.",
                                        "/patient/prescriptions", "Just now", true));
                } else if ("visit".equalsIgnoreCase(action) || "reject".equalsIgnoreCase(action)) {
                        req.setStatus("Visit Required");
                        if (reason != null && !reason.isBlank())
                                req.setNotes(reason.trim());
                        notificationService.createNotification(new Notification(
                                        "patient", patientUserId(req.getPatientId()), "Clinic Visit Needed for Refill",
                                        doctor.getName() + " requested an in-person clinic evaluation before renewing "
                                                        + req.getMedicine()
                                                        + ".",
                                        "/patient/appointments", "Just now", true));
                } else {
                        throw new ValidationException("Unsupported refill action: " + action);
                }

                refillRequestRepository.save(req);
                return new ApiResponse(true, "Refill processed successfully", req.getStatus());
        }

        private Long patientUserId(Long patientId) {
                Patient patient = patientRepository.findById(patientId)
                                .orElseThrow(() -> new NotFoundException("Patient not found"));
                return userRepository.findByEmailIgnoreCase(patient.getEmail())
                                .map(User::getId)
                                .orElseThrow(() -> new NotFoundException("Patient user account not found"));
        }

        public Map<String, Object> getReports(String timeframe) {
                Doctor doctor = currentUserService.getCurrentDoctor();
                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusDays(reportPeriodDays(timeframe) - 1L);
                List<Consultation> consultations = consultationRepository.findByDoctorId(doctor.getId()).stream()
                                .filter(c -> isWithinPeriod(c.getDate(), startDate, endDate)).toList();
                List<Prescription> prescriptions = prescriptionRepository.findByDoctorId(doctor.getId()).stream()
                                .filter(p -> isWithinPeriod(p.getDate(), startDate, endDate)).toList();

                long completed = consultations.stream().filter(c -> "Completed".equalsIgnoreCase(c.getStatus()))
                                .count();
                long aiAssisted = consultations.stream()
                                .filter(c -> c.getAiStateJson() != null && !c.getAiStateJson().isBlank()).count();
                long allergyAlerts = prescriptions.stream()
                                .filter(p -> p.getNotes() != null
                                                && p.getNotes().toLowerCase(Locale.ROOT).contains("warning"))
                                .count();

                Map<YearMonth, Long> monthlyConsultations = new LinkedHashMap<>();
                Map<YearMonth, Long> monthlyPrescriptions = new LinkedHashMap<>();
                Map<YearMonth, Long> monthlyAi = new LinkedHashMap<>();
                YearMonth current = YearMonth.now();
                for (int i = 5; i >= 0; i--)
                        monthlyConsultations.put(current.minusMonths(i), 0L);
                monthlyPrescriptions.putAll(monthlyConsultations);
                monthlyAi.putAll(monthlyConsultations);

                for (Consultation c : consultations) {
                        try {
                                YearMonth ym = YearMonth.parse(c.getDate().substring(0, 7));
                                monthlyConsultations.computeIfPresent(ym, (k, v) -> v + 1);
                                if (c.getAiStateJson() != null && !c.getAiStateJson().isBlank())
                                        monthlyAi.computeIfPresent(ym, (k, v) -> v + 1);
                        } catch (Exception ignored) {
                        }
                }
                for (Prescription rx : prescriptions) {
                        try {
                                YearMonth ym = YearMonth.parse(rx.getDate().substring(0, 7));
                                monthlyPrescriptions.computeIfPresent(ym, (k, v) -> v + 1);
                        } catch (Exception ignored) {
                        }
                }

                List<Map<String, Object>> monthlyTrends = monthlyConsultations.keySet().stream().map(ym -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("month", ym.format(DateTimeFormatter.ofPattern("MMM")));
                        item.put("consultations", monthlyConsultations.get(ym));
                        item.put("prescriptions", monthlyPrescriptions.get(ym));
                        item.put("aiDrafts", monthlyAi.get(ym));
                        return item;
                }).toList();

                Map<String, Long> conditions = new HashMap<>();
                prescriptions.stream().map(Prescription::getDiagnosis).filter(Objects::nonNull)
                                .filter(v -> !v.isBlank())
                                .forEach(d -> conditions.merge(d, 1L, Long::sum));
                long conditionTotal = Math.max(1, conditions.values().stream().mapToLong(Long::longValue).sum());
                List<Map<String, Object>> topConditions = conditions.entrySet().stream()
                                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                                .map(e -> {
                                        Map<String, Object> item = new LinkedHashMap<>();
                                        item.put("label", e.getKey());
                                        item.put("count", e.getValue());
                                        item.put("percentage", Math.round(e.getValue() * 100.0 / conditionTotal));
                                        return item;
                                })
                                .toList();

                Map<String, Long> classes = new HashMap<>();
                prescriptions.stream()
                                .flatMap(p -> p.getItems() == null ? java.util.stream.Stream.empty()
                                                : p.getItems().stream())
                                .map(PrescriptionItem::getName).filter(Objects::nonNull)
                                .forEach(name -> classes.merge(classifyMedication(name), 1L, Long::sum));
                long drugTotal = Math.max(1, classes.values().stream().mapToLong(Long::longValue).sum());
                List<Map<String, Object>> prescribedDrugClasses = classes.entrySet().stream()
                                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                                .map(e -> {
                                        Map<String, Object> item = new LinkedHashMap<>();
                                        item.put("category", e.getKey());
                                        item.put("share", Math.round(e.getValue() * 100.0 / drugTotal));
                                        return item;
                                })
                                .toList();

                Map<String, Object> aiMetrics = new LinkedHashMap<>();
                aiMetrics.putAll(aiAccuracyMetricsService.calculate(consultations));
                Map<String, Object> result = new LinkedHashMap<>();
                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("totalPatients",
                                consultations.stream().map(Consultation::getPatientId).filter(Objects::nonNull)
                                                .distinct().count());
                summary.put("consultationsCompleted", completed);
                summary.put("prescriptionsIssued", prescriptions.size());
                summary.put("aiAdoptionRate",
                                consultations.isEmpty() ? 0
                                                : Math.round(aiAssisted * 1000.0 / consultations.size()) / 10.0);
                summary.put("avgConsultTimeMinutes", null);
                summary.put("allergyAlertsAvoided", allergyAlerts);
                result.put("summary", summary);
                result.put("timeframe", timeframe);
                result.put("monthlyTrends", monthlyTrends);
                result.put("topConditions", topConditions);
                result.put("prescribedDrugClasses", prescribedDrugClasses);
                result.put("aiQualityMetrics", aiMetrics);
                return result;
        }

        private int reportPeriodDays(String timeframe) {
                return switch (timeframe == null ? "30d" : timeframe) {
                        case "7d" -> 7;
                        case "90d" -> 90;
                        case "1y" -> 365;
                        default -> 30;
                };
        }

        private boolean isWithinPeriod(String value, LocalDate start, LocalDate end) {
                if (value == null || value.isBlank())
                        return false;
                try {
                        LocalDate date = LocalDate.parse(value.length() >= 10 ? value.substring(0, 10) : value);
                        return !date.isBefore(start) && !date.isAfter(end);
                } catch (java.time.format.DateTimeParseException ex) {
                        return false;
                }
        }

        private String classifyMedication(String name) {
                String lower = name.toLowerCase(Locale.ROOT);
                if (lower.contains("amlodipine") || lower.contains("lisinopril") || lower.contains("losartan"))
                        return "Antihypertensive";
                if (lower.contains("metformin") || lower.contains("insulin"))
                        return "Antidiabetic";
                if (lower.contains("salbutamol") || lower.contains("albuterol") || lower.contains("budesonide")
                                || lower.contains("inhaler"))
                        return "Respiratory";
                if (lower.contains("amoxicillin") || lower.contains("azithromycin") || lower.contains("antibiotic"))
                        return "Antibiotic";
                if (lower.contains("paracetamol") || lower.contains("ibuprofen") || lower.contains("acetaminophen"))
                        return "Analgesic / Antipyretic";
                return "Other";
        }

        private Map<String, Object> defaultSettings() {
                return new HashMap<>(Map.of(
                                "profile", new HashMap<>(Map.of(
                                                "fullName", "Doctor", "specialization", "", "qualifications", "",
                                                "licenseNumber", "",
                                                "hospitalAffiliation", "", "department", "", "phone", "", "email", "",
                                                "experienceYears", 0,
                                                "consultationFee", 0)),
                                "preferences", new HashMap<>(Map.of(
                                                "defaultFollowUpDays", 14, "autoStartRecording", true,
                                                "strictAllergyChecks", true, "defaultRxNotes",
                                                "Take medications strictly as instructed and report adverse reactions.")),
                                "notifications", new HashMap<>(Map.of("patientMessagePush", true))));
        }

        @SuppressWarnings("unchecked")
        public Map<String, Object> getSettings() {
                Doctor doctor = currentUserService.getCurrentDoctor();
                Map<String, Object> settings = userSettingsService.getOrCreate(currentUserService.getUser().getId(),
                                "doctor",
                                defaultSettings());
                Map<String, Object> profile = new HashMap<>(
                                (Map<String, Object>) settings.getOrDefault("profile", new HashMap<>()));
                profile.put("fullName", doctor.getName());
                profile.put("email", doctor.getEmail());
                if (doctor.getSpecialization() != null)
                        profile.put("specialization", doctor.getSpecialization());
                if (doctor.getLicenseNumber() != null)
                        profile.put("licenseNumber", doctor.getLicenseNumber());
                if (doctor.getHospital() != null)
                        profile.put("hospitalAffiliation", doctor.getHospital());
                if (doctor.getPhone() != null)
                        profile.put("phone", doctor.getPhone());
                if (doctor.getExperienceYears() != null)
                        profile.put("experienceYears", doctor.getExperienceYears());
                settings.put("profile", profile);
                return settings;
        }

        @Transactional
        public Map<String, Object> updateSettings(Map<String, Object> newSettings) {
                Doctor doctor = currentUserService.getCurrentDoctor();
                User user = currentUserService.getUser();
                Object rawProfile = newSettings == null ? null : newSettings.get("profile");
                if (rawProfile instanceof Map<?, ?> profile) {
                        String fullName = profileString(profile, "fullName");
                        if (fullName != null && !fullName.isBlank()) {
                                doctor.setName(fullName);
                                user.setName(fullName);
                                userRepository.save(user);
                        }
                        String specialization = profileString(profile, "specialization");
                        if (specialization != null && !specialization.isBlank())
                                doctor.setSpecialization(specialization);
                        String licenseNumber = profileString(profile, "licenseNumber");
                        if (licenseNumber != null && !licenseNumber.isBlank())
                                doctor.setLicenseNumber(licenseNumber);
                        String hospital = profileString(profile, "hospitalAffiliation");
                        if (hospital != null)
                                doctor.setHospital(hospital);
                        String phone = profileString(profile, "phone");
                        if (phone != null)
                                doctor.setPhone(phone);
                        Object experienceYears = profile.get("experienceYears");
                        if (experienceYears instanceof Number years && years.intValue() >= 0)
                                doctor.setExperienceYears(years.intValue());
                        doctorRepository.save(doctor);
                }
                return userSettingsService.replace(user.getId(), "doctor", newSettings, defaultSettings());
        }

        private String profileString(Map<?, ?> profile, String key) {
                Object value = profile.get(key);
                return value instanceof String text ? text.trim() : null;
        }
}
