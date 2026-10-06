package com.medicare.service;

import com.medicare.dto.ApiResponse;
import com.medicare.dto.VitalLogRequest;
import com.medicare.dto.UpdateProfileRequest;
import com.medicare.dto.AddReminderRequest;
import com.medicare.dto.BookAppointmentRequest;
import com.medicare.entity.*;
import com.medicare.repository.*;
import com.medicare.security.CurrentUserService;
import com.medicare.exception.ForbiddenException;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final RefillRequestRepository refillRequestRepository;
    private final VitalLogRepository vitalLogRepository;
    private final ConsultationRepository consultationRepository;
    private final MedicineReminderRepository reminderRepository;
    private final NotificationRepository notificationRepository;
    private final AppointmentRepository appointmentRepository;
    private final CurrentUserService currentUserService;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PatientDocumentRepository patientDocumentRepository;
    private final LabTestRepository labTestRepository;
    private final ClinicalMessageService clinicalMessageService;
    private final ObjectMapper objectMapper;

    public PatientService(PatientRepository patientRepository,
                          PrescriptionRepository prescriptionRepository,
                          RefillRequestRepository refillRequestRepository,
                          VitalLogRepository vitalLogRepository,
                          ConsultationRepository consultationRepository,
                          MedicineReminderRepository reminderRepository,
                          NotificationRepository notificationRepository,
                          AppointmentRepository appointmentRepository,
                          CurrentUserService currentUserService,
                          DoctorRepository doctorRepository,
                          UserRepository userRepository,
                          PatientDocumentRepository patientDocumentRepository,
                          LabTestRepository labTestRepository,
                          ClinicalMessageService clinicalMessageService,
                          ObjectMapper objectMapper) {
        this.patientRepository = patientRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.refillRequestRepository = refillRequestRepository;
        this.vitalLogRepository = vitalLogRepository;
        this.consultationRepository = consultationRepository;
        this.reminderRepository = reminderRepository;
        this.notificationRepository = notificationRepository;
        this.appointmentRepository = appointmentRepository;
        this.currentUserService = currentUserService;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.patientDocumentRepository = patientDocumentRepository;
        this.labTestRepository = labTestRepository;
        this.clinicalMessageService = clinicalMessageService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> getDashboard() {
        Map<String, Object> data = new HashMap<>();

        Patient pat = currentUserService.getCurrentPatient();
        data.put("profile", pat);

        // Current Vitals from DB
        List<VitalLog> logs = vitalLogRepository.findByPatientIdOrderByMeasuredAtDesc(pat.getId());
        VitalLog latest = logs.isEmpty() ? null : logs.get(0);
        String lastDate = latest != null ? latest.getMeasuredAt() : null;

        List<Map<String, Object>> vitals = new ArrayList<>();

        if (latest != null) {
            if (latest.getBpSys() != null) {
                Map<String, Object> bp = new LinkedHashMap<>();
                bp.put("key", "bp");
                bp.put("label", "Blood Pressure");
                bp.put("value", latest.getBpSys() + (latest.getBpDia() != null ? "/" + latest.getBpDia() : ""));
                bp.put("unit", "mmHg");
                bp.put("status", getBloodPressureStatus(latest.getBpSys(), latest.getBpDia()));
                bp.put("tone", getBloodPressureTone(latest.getBpSys(), latest.getBpDia()));
                bp.put("lastUpdated", lastDate);
                vitals.add(bp);
            }

            if (latest.getHeartRate() != null) {
                Map<String, Object> hr = new LinkedHashMap<>();
                hr.put("key", "hr");
                hr.put("label", "Heart Rate");
                hr.put("value", String.valueOf(latest.getHeartRate()));
                hr.put("unit", "bpm");
                hr.put("status", getHeartRateStatus(latest.getHeartRate()));
                hr.put("tone", "blue");
                hr.put("lastUpdated", lastDate);
                vitals.add(hr);
            }

            if (latest.getSpo2() != null) {
                Map<String, Object> spo2 = new LinkedHashMap<>();
                spo2.put("key", "spo2");
                spo2.put("label", "Oxygen (SpO2)");
                spo2.put("value", String.valueOf(latest.getSpo2()));
                spo2.put("unit", "%");
                spo2.put("status", getSpo2Status(latest.getSpo2()));
                spo2.put("tone", getSpo2Tone(latest.getSpo2()));
                spo2.put("lastUpdated", lastDate);
                vitals.add(spo2);
            }

            if (latest.getGlucose() != null) {
                Map<String, Object> glucose = new LinkedHashMap<>();
                glucose.put("key", "glucose");
                glucose.put("label", "Fasting Blood Sugar");
                glucose.put("value", String.valueOf(latest.getGlucose()));
                glucose.put("unit", "mg/dL");
                glucose.put("status", getGlucoseStatus(latest.getGlucose()));
                glucose.put("tone", "purple");
                glucose.put("lastUpdated", lastDate);
                vitals.add(glucose);
            }
        }

        data.put("vitals", vitals);
        data.put("vitalsLastUpdated", lastDate);

        data.put("activePrescriptions", prescriptionRepository.findByPatientId(pat.getId()).stream()
                .filter(p -> "Finalized".equalsIgnoreCase(p.getStatus()))
                .toList());
        data.put("reminders", reminderRepository.findByPatientId(pat.getId()));
        data.put("appointments", appointmentRepository.findByPatientId(pat.getId()));

        List<Map<String, Object>> history = logs.stream()
                .limit(7)
                .map(l -> {
                    Map<String, Object> h = new LinkedHashMap<>();
                    h.put("date", l.getMeasuredAt());
                    if (l.getBpSys() != null) h.put("bpSys", l.getBpSys());
                    if (l.getBpDia() != null) h.put("bpDia", l.getBpDia());
                    if (l.getHeartRate() != null) h.put("hr", l.getHeartRate());
                    if (l.getSpo2() != null) h.put("spo2", l.getSpo2());
                    if (l.getGlucose() != null) h.put("glucose", l.getGlucose());
                    if (l.getWeightKg() != null) h.put("weight", l.getWeightKg());
                    return h;
                })
                .toList();
        data.put("vitalsHistory", history);

        List<Consultation> visits = consultationRepository.findByPatientId(pat.getId());
        data.put("recentVisit", visits.isEmpty() ? null : visits.get(0));

        return data;
    }

    public ApiResponse logVital(VitalLogRequest req) {
        Patient patient = currentUserService.getCurrentPatient();
        VitalLog log = new VitalLog();
        log.setPatientId(patient.getId());
        log.setSource("HOME");
        log.setMeasuredAt(LocalDate.now().toString());

        boolean isCritical = false;

        try {
            if (req.getBpSys() != null && !req.getBpSys().isBlank()) {
                int systolic = Integer.parseInt(req.getBpSys().trim());

                if (req.getBpDia() == null || req.getBpDia().isBlank()) {
                    throw new ValidationException("Diastolic blood pressure is required when systolic pressure is provided");
                }

                int diastolic = Integer.parseInt(req.getBpDia().trim());
                if (systolic <= 0 || diastolic <= 0) {
                    throw new ValidationException("Blood pressure values must be greater than zero");
                }

                log.setBpSys(systolic);
                log.setBpDia(diastolic);
                if (systolic >= 180 || diastolic >= 110) isCritical = true;
            }

            if (req.getHr() != null && !req.getHr().isBlank()) {
                int heartRate = Integer.parseInt(req.getHr().trim());
                if (heartRate <= 0) throw new ValidationException("Heart rate must be greater than zero");
                log.setHeartRate(heartRate);
                if (heartRate >= 150 || heartRate <= 40) isCritical = true;
            }

            if (req.getSpo2() != null && !req.getSpo2().isBlank()) {
                int spo2 = Integer.parseInt(req.getSpo2().trim());
                if (spo2 < 0 || spo2 > 100) throw new ValidationException("SpO2 must be between 0 and 100");
                log.setSpo2(spo2);
                if (spo2 < 92) isCritical = true;
            }

            if (req.getGlucose() != null && !req.getGlucose().isBlank()) {
                int glucose = Integer.parseInt(req.getGlucose().trim());
                if (glucose <= 0) throw new ValidationException("Glucose must be greater than zero");
                log.setGlucose(glucose);
                if (glucose >= 250) isCritical = true;
            }

            if (req.getWeightKg() != null && !req.getWeightKg().isBlank()) {
                double weightKg = Double.parseDouble(req.getWeightKg().trim());
                if (weightKg <= 0) throw new ValidationException("Weight must be greater than zero");
                log.setWeightKg(weightKg);
            }
        } catch (NumberFormatException e) {
            throw new ValidationException("Vital values must be valid numbers");
        }

        if (log.getBpSys() == null
                && log.getHeartRate() == null
                && log.getSpo2() == null
                && log.getGlucose() == null
                && log.getWeightKg() == null) {
            throw new ValidationException("At least one vital value is required");
        }

        log.setIsCritical(isCritical);
        vitalLogRepository.save(log);

        if (isCritical) {
            notificationRepository.save(new Notification(
                    "doctor",
                    getPrimaryDoctorUserId(patient),
                    "Critical Vital Flagged: " + patient.getName(),
                    "A critical home vital reading was recorded. Please review the patient's latest vitals.",
                    "/doctor/patients/" + patient.getId(),
                    "Just now",
                    true
            ));

            return new ApiResponse(
                    true,
                    "A critical reading was detected. Please repeat the measurement and seek medical attention if you have concerning symptoms.",
                    true
            );
        }

        return new ApiResponse(true, "Health reading logged and verified successfully.", false);
    }

    private String getBloodPressureStatus(Integer systolic, Integer diastolic) {
        if (systolic == null || diastolic == null) return "Unavailable";
        if (systolic >= 140 || diastolic >= 90) return "Elevated";
        if (systolic >= 130 || diastolic >= 80) return "Stage 1";
        return "Optimal";
    }

    private String getBloodPressureTone(Integer systolic, Integer diastolic) {
        if (systolic == null || diastolic == null) return "green";
        if (systolic >= 140 || diastolic >= 90) return "orange";
        return "green";
    }

    private String getHeartRateStatus(Integer heartRate) {
        if (heartRate == null) return "Unavailable";
        if (heartRate < 40 || heartRate > 120) return "Abnormal";
        return "Resting";
    }

    private String getSpo2Status(Integer spo2) {
        if (spo2 == null) return "Unavailable";
        if (spo2 < 92) return "Low";
        if (spo2 < 95) return "Borderline";
        return "Healthy";
    }

    private String getSpo2Tone(Integer spo2) {
        if (spo2 == null) return "green";
        return spo2 < 92 ? "orange" : "green";
    }

    private String getGlucoseStatus(Integer glucose) {
        if (glucose == null) return "Unavailable";
        if (glucose >= 250) return "High";
        if (glucose >= 126) return "Elevated";
        return "Normal";
    }

    public ApiResponse requestRefill(Long prescriptionId, String notes) {
        Patient patient = currentUserService.getCurrentPatient();
        Prescription rx = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new NotFoundException("Prescription not found"));

        if (!Objects.equals(rx.getPatientId(), patient.getId())) {
            throw new ForbiddenException("You can only request refills for your own prescriptions");
        }

        RefillRequest req = new RefillRequest();
        req.setPrescriptionId(prescriptionId);
        req.setPrescriptionCode(rx.getCode());
        req.setPatientId(patient.getId());
        req.setPatientName(patient.getName());
        req.setMedicine(!rx.getItems().isEmpty() ? rx.getItems().get(0).getName() + " " + rx.getItems().get(0).getStrength() : "Medication Refill");
        req.setDosage(!rx.getItems().isEmpty() ? rx.getItems().get(0).getDosage() : "1 tablet daily");

        List<VitalLog> patientLogs = vitalLogRepository.findByPatientIdOrderByMeasuredAtDesc(patient.getId());
        String vitalsStr = "BP 120/80 on " + LocalDate.now();
        if (!patientLogs.isEmpty()) {
            VitalLog latestLog = patientLogs.get(0);
            if (latestLog.getBpSys() != null) {
                vitalsStr = "BP " + latestLog.getBpSys() + "/" + (latestLog.getBpDia() != null ? latestLog.getBpDia() : 80) + " on " + latestLog.getMeasuredAt();
            }
        }
        req.setLastVitals(vitalsStr);

        req.setRequestedDate(LocalDate.now().toString());
        req.setStatus("Pending");
        req.setNotes(notes != null && !notes.isBlank() ? notes : "Supply running low; requesting 30-day renewal.");

        refillRequestRepository.save(req);

        // Notify Doctor
        notificationRepository.save(new Notification(
                "doctor",
                getPrimaryDoctorUserId(patient),
                "New Refill Request: " + patient.getName(),
                "Refill requested for " + req.getMedicine() + ".",
                "/doctor/dashboard",
                "Just now",
                true
        ));

        return new ApiResponse(true, "Refill request submitted to your primary care team.");
    }

    public List<Prescription> getPrescriptions(String status, String q) {
        Patient patient = currentUserService.getCurrentPatient();
        List<Prescription> list = prescriptionRepository.findByPatientId(patient.getId());
        if (status != null && !status.equalsIgnoreCase("All")) {
            list = list.stream().filter(p -> p.getStatus().equalsIgnoreCase(status)).toList();
        }
        if (q != null && !q.isBlank()) {
            String queryLower = q.trim().toLowerCase();
            list = list.stream().filter(p ->
                    (p.getCode() != null && p.getCode().toLowerCase().contains(queryLower)) ||
                    (p.getDoctor() != null && p.getDoctor().toLowerCase().contains(queryLower)) ||
                    (p.getDiagnosis() != null && p.getDiagnosis().toLowerCase().contains(queryLower)) ||
                    (p.getItems() != null && p.getItems().stream().anyMatch(i -> i.getName() != null && i.getName().toLowerCase().contains(queryLower)))
            ).toList();
        }
        return list;
    }

    public List<Consultation> getVisitSummaries() {
        Patient patient = currentUserService.getCurrentPatient();
        return consultationRepository.findByPatientId(patient.getId());
    }

    public List<MedicineReminder> getReminders() {
        Patient patient = currentUserService.getCurrentPatient();
        return reminderRepository.findByPatientId(patient.getId());
    }

    public MedicineReminder toggleReminder(Long id) {
        Patient patient = currentUserService.getCurrentPatient();
        MedicineReminder rem = reminderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Reminder not found"));
        if (!Objects.equals(rem.getPatientId(), patient.getId())) {
            throw new ForbiddenException("You can only update your own medicine reminders");
        }
        boolean wasTaken = Boolean.TRUE.equals(rem.getTaken());
        rem.setTaken(!wasTaken);
        if (!wasTaken) {
            rem.setTakenAt("Just now");
            rem.setStreakDays((rem.getStreakDays() == null ? 0 : rem.getStreakDays()) + 1);
        } else {
            rem.setTakenAt(null);
            rem.setStreakDays(Math.max(0, (rem.getStreakDays() == null ? 1 : rem.getStreakDays()) - 1));
        }
        return reminderRepository.save(rem);
    }

    public MedicineReminder addReminder(AddReminderRequest req) {
        Patient patient = currentUserService.getCurrentPatient();
        MedicineReminder reminder = new MedicineReminder();
        reminder.setPatientId(patient.getId());
        reminder.setMedicineName(req.getMedicineName());
        reminder.setStrength(req.getStrength());
        reminder.setDosage(req.getDosage());
        reminder.setSlot(req.getSlot() != null ? req.getSlot() : "Morning");
        reminder.setTime(req.getTime() != null ? req.getTime() : "08:00 AM");
        reminder.setFood(req.getFood() != null ? req.getFood() : "After meals");
        reminder.setInstructions(req.getInstructions());
        reminder.setTaken(false);
        reminder.setStreakDays(0);
        reminder.setTotalPills(req.getTotalPills() != null ? req.getTotalPills() : 30);
        reminder.setRemainingPills(req.getRemainingPills() != null ? req.getRemainingPills() : 30);
        return reminderRepository.save(reminder);
    }

    public List<Appointment> getAppointments() {
        Patient patient = currentUserService.getCurrentPatient();
        return appointmentRepository.findByPatientId(patient.getId());
    }

    @Transactional
    public Appointment bookAppointment(BookAppointmentRequest req) {
        Patient patient = currentUserService.getCurrentPatient();
        if (req.getDoctorId() == null) {
            throw new ValidationException("A valid doctor is required for an appointment");
        }

        Doctor doctor = doctorRepository.findById(req.getDoctorId())
                .filter(d -> "Active".equalsIgnoreCase(d.getStatus()))
                .orElseThrow(() -> new NotFoundException("Selected doctor is not available"));

        boolean patientConflict = appointmentRepository.findByPatientIdAndDateAndTime(patient.getId(), req.getDate(), req.getTime()).stream()
                .anyMatch(a -> !"Cancelled".equalsIgnoreCase(a.getStatus()) && !"Completed".equalsIgnoreCase(a.getStatus()));
        if (patientConflict) {
            throw new ValidationException("You already have an active appointment at this date and time");
        }

        boolean doctorConflict = appointmentRepository.findByDoctorId(doctor.getId()).stream()
                .anyMatch(a -> Objects.equals(a.getDate(), req.getDate())
                        && Objects.equals(a.getTime(), req.getTime())
                        && !"Cancelled".equalsIgnoreCase(a.getStatus())
                        && !"Completed".equalsIgnoreCase(a.getStatus()));
        if (doctorConflict) {
            throw new ValidationException("The selected doctor is not available at this date and time");
        }

        Appointment appointment = new Appointment();
        appointment.setPatientId(patient.getId());
        appointment.setPatient(patient.getName());
        appointment.setDoctorId(doctor.getId());
        appointment.setDoctor(doctor.getName());
        appointment.setSpecialty(doctor.getSpecialization());
        appointment.setHospital(doctor.getHospital());
        appointment.setDate(req.getDate());
        appointment.setTime(req.getTime());
        appointment.setType(req.getType() != null ? req.getType() : "In-person OPD");
        appointment.setRoom(req.getRoom() != null ? req.getRoom() : "OPD Consultation Suite");
        appointment.setReason(req.getReason());
        appointment.setStatus("Scheduled");

        String cleanName = doctor.getName() == null ? "DR" : doctor.getName().replaceFirst("^Dr\\.?\\s*", "").trim();
        appointment.setDoctorAvatar(cleanName.length() >= 2 ? cleanName.substring(0, 2).toUpperCase() : cleanName.toUpperCase());

        Appointment savedAppointment = appointmentRepository.save(appointment);

        Consultation consultation = new Consultation();
        consultation.setAppointmentId(savedAppointment.getId());
        consultation.setDoctorId(doctor.getId());
        consultation.setDoctorName(doctor.getName());
        consultation.setPatientId(patient.getId());
        consultation.setPatientName(patient.getName());
        consultation.setDate(savedAppointment.getDate());
        consultation.setTime(savedAppointment.getTime());
        consultation.setType(savedAppointment.getType());
        consultation.setStatus("Scheduled");
        consultation.setRoom(savedAppointment.getRoom());
        consultation.setChiefComplaint(savedAppointment.getReason());
        consultationRepository.save(consultation);

        // Keep the patient's primary physician synchronized with the actual selected doctor.
        if (patient.getPrimaryDoctor() == null || patient.getPrimaryDoctor().isBlank()) {
            patient.setPrimaryDoctor(doctor.getName());
            patientRepository.save(patient);
        }

        return savedAppointment;
    }

    public ApiResponse cancelAppointment(Long id) {
        Patient patient = currentUserService.getCurrentPatient();

        return appointmentRepository.findById(id).map(a -> {

            if (!Objects.equals(
                    a.getPatientId(),
                    patient.getId()
            )) {
                throw new ForbiddenException(
                        "You can only cancel your own appointments"
                );
            }

            /*
            * Cancel appointment.
            */
            a.setStatus("Cancelled");
            appointmentRepository.save(a);

            /*
            * Cancel the linked consultation too.
            */
            consultationRepository
                    .findByAppointmentId(a.getId())
                    .ifPresent(c -> {

                        if (!"Completed".equalsIgnoreCase(
                                c.getStatus()
                        )) {

                            c.setStatus("Cancelled");

                            consultationRepository.save(c);
                        }
                    });

            return new ApiResponse(
                    true,
                    "Appointment cancelled"
            );

        }).orElse(
                new ApiResponse(
                        false,
                        "Appointment not found"
                )
        );
    }

    public Patient getProfile() {
        return currentUserService.getCurrentPatient();
    }

    public Patient updateProfile(UpdateProfileRequest updated) {
        Patient pat = currentUserService.getCurrentPatient();
        if (pat == null) {
            throw new NotFoundException("Patient profile not found");
        }
        if (updated.getPhone() != null && !updated.getPhone().isBlank()) {
            pat.setPhone(updated.getPhone().trim());
        }
        if (updated.getAddress() != null && !updated.getAddress().isBlank()) {
            pat.setAddress(updated.getAddress().trim());
        }
        return patientRepository.save(pat);
    }

    public List<Map<String, Object>> getAvailableDoctors() {
        return doctorRepository.findByStatus("Active").stream().map(doctor -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", doctor.getId());
            result.put("name", doctor.getName());
            result.put("specialty", doctor.getSpecialization());
            result.put("hospital", doctor.getHospital());
            result.put("rating", doctor.getRating());
            return result;
        }).toList();
    }

    public Map<String, Object> getMedicalRecords() {
        Patient patient = currentUserService.getCurrentPatient();
        Map<String, Object> records = new LinkedHashMap<>();
        records.put("allergies", patient.getAllergies().stream().map(allergy -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "allergy-" + allergy.hashCode());
            item.put("allergen", allergy);
            item.put("severity", "Reported");
            item.put("reaction", "Patient reported");
            item.put("diagnosedYear", LocalDate.now().getYear());
            item.put("verifiedBy", "Patient Record");
            return item;
        }).toList());
        records.put("chronicConditions", patient.getConditions().stream().map(condition -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "condition-" + condition.hashCode());
            item.put("condition", condition);
            item.put("status", "Active");
            item.put("diagnosedDate", patient.getLastVisit() != null ? patient.getLastVisit() : "Not recorded");
            item.put("doctor", patient.getPrimaryDoctor() != null ? patient.getPrimaryDoctor() : "Not assigned");
            item.put("managementPlan", "Continue current clinical management and follow-up as advised.");
            return item;
        }).toList());
        records.put("vaccinations", readJsonList(patient.getVaccinationsJson()));
        records.put("surgeries", readJsonList(patient.getSurgeriesJson()));
        records.put("familyHistory", readJsonList(patient.getFamilyHistoryJson()));
        records.put("documents", patientDocumentRepository.findByPatientIdOrderByIdDesc(patient.getId()).stream().map(doc -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", doc.getId());
            item.put("name", doc.getName());
            item.put("category", doc.getCategory());
            item.put("date", doc.getDate());
            item.put("size", doc.getSize());
            item.put("provider", doc.getProvider());
            return item;
        }).toList());
        return records;
    }

    public Map<String, Object> addAllergy(Map<String, Object> body) {
        Patient patient = currentUserService.getCurrentPatient();
        String allergen = String.valueOf(body.getOrDefault("allergen", body.getOrDefault("name", ""))).trim();
        if (allergen.isBlank()) throw new ValidationException("Allergen is required");
        if (!patient.getAllergies().contains(allergen)) patient.getAllergies().add(allergen);
        patientRepository.save(patient);
        Map<String, Object> item = new HashMap<>(body);
        item.put("id", "allergy-" + System.currentTimeMillis());
        item.put("allergen", allergen);
        item.put("verifiedBy", "Patient Reported");
        return item;
    }

    public Map<String, Object> addCondition(Map<String, Object> body) {
        Patient patient = currentUserService.getCurrentPatient();
        String condition = String.valueOf(body.getOrDefault("condition", body.getOrDefault("name", ""))).trim();
        if (condition.isBlank()) throw new ValidationException("Condition is required");
        if (!patient.getConditions().contains(condition)) patient.getConditions().add(condition);
        patientRepository.save(patient);
        Map<String, Object> item = new HashMap<>(body);
        item.put("id", "condition-" + System.currentTimeMillis());
        item.put("condition", condition);
        item.put("status", body.getOrDefault("status", "Active"));
        item.put("doctor", patient.getPrimaryDoctor());
        return item;
    }

    public Map<String, Object> uploadDocument(Map<String, Object> body) {
        Patient patient = currentUserService.getCurrentPatient();
        String name = String.valueOf(body.getOrDefault("name", "")).trim();
        if (name.isBlank()) throw new ValidationException("Document name is required");
        PatientDocument document = new PatientDocument();
        document.setPatientId(patient.getId());
        document.setName(name);
        document.setCategory(String.valueOf(body.getOrDefault("category", "General")));
        document.setDate(LocalDate.now().toString());
        document.setSize(String.valueOf(body.getOrDefault("size", "Unknown")));
        document.setProvider(String.valueOf(body.getOrDefault("provider", "Patient Upload")));
        document = patientDocumentRepository.save(document);
        return Map.of("id", document.getId(), "name", document.getName(), "category", document.getCategory(), "date", document.getDate(), "size", document.getSize(), "provider", document.getProvider());
    }

    public List<Map<String, Object>> getLabTests() {
        Patient patient = currentUserService.getCurrentPatient();
        return labTestRepository.findByPatientIdOrderByIdDesc(patient.getId()).stream().map(this::toLabMap).toList();
    }

    public Map<String, Object> bookLabTest(Map<String, Object> booking) {
        Patient patient = currentUserService.getCurrentPatient();
        LabTest test = new LabTest();
        test.setPatientId(patient.getId());
        test.setTestName(String.valueOf(booking.getOrDefault("testName", "Diagnostic Test")));
        test.setCategory(String.valueOf(booking.getOrDefault("category", "Diagnostics")));
        test.setDate(String.valueOf(booking.getOrDefault("date", LocalDate.now())));
        test.setOrderingDoctor(patient.getPrimaryDoctor() != null ? patient.getPrimaryDoctor() : "Self-scheduled");
        test.setFacility(String.valueOf(booking.getOrDefault("facility", "MediCare Central Laboratory")));
        test.setStatus("Scheduled");
        test.setAnalytesJson("[]");
        test.setDoctorComment("Awaiting specimen collection on scheduled date.");
        return toLabMap(labTestRepository.save(test));
    }

    private Map<String, Object> toLabMap(LabTest test) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", test.getId());
        result.put("testName", test.getTestName());
        result.put("category", test.getCategory());
        result.put("date", test.getDate());
        result.put("orderingDoctor", test.getOrderingDoctor());
        result.put("facility", test.getFacility());
        result.put("status", test.getStatus());
        result.put("analytes", readJsonList(test.getAnalytesJson()));
        result.put("doctorComment", test.getDoctorComment());
        return result;
    }

    public Map<String, Object> getPatientMessages() {
        return clinicalMessageService.getPatientThread();
    }

    public Map<String, Object> sendPatientMessage(String text) {
        return clinicalMessageService.sendFromPatient(text);
    }

    private List<Map<String, Object>> readJsonList(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private Long getPrimaryDoctorUserId(Patient patient) {
        if (patient.getPrimaryDoctor() == null || patient.getPrimaryDoctor().isBlank()) {
            throw new NotFoundException("Primary doctor is not configured for this patient");
        }
        Doctor doctor = doctorRepository.findByNameIgnoreCase(patient.getPrimaryDoctor().trim())
                .orElseThrow(() -> new NotFoundException("Primary doctor not found: " + patient.getPrimaryDoctor()));
        return userRepository.findByEmailIgnoreCase(doctor.getEmail())
                .orElseThrow(() -> new NotFoundException("Primary doctor user account not found"))
                .getId();
    }

}
