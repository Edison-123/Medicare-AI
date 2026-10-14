package com.medicare.service;

import com.medicare.entity.ClinicalMessage;
import com.medicare.entity.Doctor;
import com.medicare.entity.Notification;
import com.medicare.entity.Patient;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.ForbiddenException;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.ClinicalMessageRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.NotificationRepository;
import com.medicare.security.CurrentUserService;
import com.medicare.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClinicalMessageService {

    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("MMM dd, hh:mm a");

    private final ClinicalMessageRepository messageRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final CurrentUserService currentUserService;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public ClinicalMessageService(ClinicalMessageRepository messageRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            AppointmentRepository appointmentRepository,
            ConsultationRepository consultationRepository,
            PrescriptionRepository prescriptionRepository,
            CurrentUserService currentUserService,
            NotificationRepository notificationRepository,
            UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.consultationRepository = consultationRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.currentUserService = currentUserService;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> listDoctorThreads() {
        Doctor doctor = currentUserService.getCurrentDoctor();
        Set<Long> patientIds = new LinkedHashSet<>();
        patientRepository.findAll().stream()
                .filter(p -> p.getPrimaryDoctor() != null && p.getPrimaryDoctor().equalsIgnoreCase(doctor.getName()))
                .map(Patient::getId)
                .forEach(patientIds::add);
        appointmentRepository.findByDoctorId(doctor.getId()).stream().map(a -> a.getPatientId())
                .filter(Objects::nonNull).forEach(patientIds::add);
        consultationRepository.findByDoctorId(doctor.getId()).stream().map(c -> c.getPatientId())
                .filter(Objects::nonNull).forEach(patientIds::add);
        prescriptionRepository.findByDoctorId(doctor.getId()).stream().map(p -> p.getPatientId())
                .filter(Objects::nonNull).forEach(patientIds::add);
        messageRepository.findByDoctorIdOrderByIdAsc(doctor.getId()).stream().map(ClinicalMessage::getPatientId)
                .forEach(patientIds::add);

        return patientIds.stream()
                .map(patientRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .map(patient -> toThread(doctor, patient))
                .toList();
    }

    public Map<String, Object> getDoctorThread(Long patientId) {
        Doctor doctor = currentUserService.getCurrentDoctor();
        Patient patient = getPatient(patientId);
        assertDoctorCanAccessPatient(doctor, patient);
        return toThread(doctor, patient);
    }

    @Transactional
    public Map<String, Object> sendFromDoctor(Long patientId, String text) {
        Doctor doctor = currentUserService.getCurrentDoctor();
        Patient patient = getPatient(patientId);
        assertDoctorCanAccessPatient(doctor, patient);
        return saveMessage(patient, doctor, doctorUserId(doctor), Role.ROLE_DOCTOR.name(), text);
    }

    public Map<String, Object> markDoctorThreadRead(Long patientId) {
        Doctor doctor = currentUserService.getCurrentDoctor();
        Patient patient = getPatient(patientId);
        assertDoctorCanAccessPatient(doctor, patient);
        messageRepository.findByPatientIdAndDoctorIdOrderByIdAsc(patientId, doctor.getId()).stream()
                .filter(m -> Boolean.FALSE.equals(m.getReadByDoctor()))
                .forEach(m -> m.setReadByDoctor(true));
        messageRepository.saveAll(messageRepository.findByPatientIdAndDoctorIdOrderByIdAsc(patientId, doctor.getId()));
        return Map.of("ok", true);
    }

    public Map<String, Object> getPatientThread() {
        Patient patient = currentUserService.getCurrentPatient();
        Doctor doctor = resolvePatientDoctor(patient);
        return toThread(doctor, patient);
    }

    @Transactional
    public Map<String, Object> sendFromPatient(String text) {
        Patient patient = currentUserService.getCurrentPatient();
        Doctor doctor = resolvePatientDoctor(patient);
        return saveMessage(patient, doctor, patientUserId(patient), Role.ROLE_PATIENT.name(), text);
    }

    private Map<String, Object> saveMessage(Patient patient, Doctor doctor, Long senderUserId, String role,
            String rawText) {
        String text = rawText == null ? "" : rawText.trim();
        if (text.isBlank())
            throw new ValidationException("Message text is required");

        ClinicalMessage message = new ClinicalMessage();
        message.setPatientId(patient.getId());
        message.setDoctorId(doctor.getId());
        message.setSenderUserId(senderUserId);
        message.setSenderRole(role);
        message.setText(text);
        message.setCreatedAt(LocalDateTime.now().format(DISPLAY_TIME));
        message.setReadByDoctor(Role.ROLE_DOCTOR.name().equals(role));
        message.setReadByPatient(Role.ROLE_PATIENT.name().equals(role));
        messageRepository.save(message);
        boolean sentByDoctor = Role.ROLE_DOCTOR.name().equals(role);
        if (sentByDoctor) {
            notificationRepository.save(new Notification(
                    "patient",
                    userIdForEmail(patient.getEmail(), "Patient"),
                    "New message from your doctor",
                    doctor.getName() + " sent you a secure message.",
                    "/patient/messages",
                    "Just now",
                    true));
        } else {
            notificationRepository.save(new Notification(
                    "doctor",
                    userIdForEmail(doctor.getEmail(), "Doctor"),
                    "New message from your patient",
                    patient.getName() + " sent you a secure message.",
                    "/doctor/messages",
                    "Just now",
                    true));
        }
        notificationRepository.save(new Notification(
                "admin",
                null,
                "New clinical message activity",
                "A patient and doctor exchanged a secure message.",
                "/admin/dashboard",
                "Just now",
                true));
        return toMessage(message);
    }

    private Long userIdForEmail(String email, String roleName) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(User::getId)
                .orElseThrow(() -> new NotFoundException(roleName + " account not found"));
    }

    private Map<String, Object> toThread(Doctor doctor, Patient patient) {
        List<ClinicalMessage> messages = messageRepository.findByPatientIdAndDoctorIdOrderByIdAsc(patient.getId(),
                doctor.getId());
        long unreadForDoctor = messages.stream().filter(m -> Boolean.FALSE.equals(m.getReadByDoctor())).count();
        long unreadForPatient = messages.stream().filter(m -> Boolean.FALSE.equals(m.getReadByPatient())).count();
        String lastActivity = messages.isEmpty() ? "No messages" : messages.get(messages.size() - 1).getCreatedAt();
        Map<String, Object> thread = new LinkedHashMap<>();
        thread.put("patientId", patient.getId());
        thread.put("patientName", patient.getName());
        thread.put("doctorId", doctor.getId());
        thread.put("doctorName", doctor.getName());
        thread.put("unreadCount",
                currentUserService.getUser().getRole() == Role.ROLE_PATIENT ? unreadForPatient : unreadForDoctor);
        thread.put("lastActivity", lastActivity);
        thread.put("messages", messages.stream().map(this::toMessage).toList());
        return thread;
    }

    private Map<String, Object> toMessage(ClinicalMessage message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", message.getId());
        result.put("sender", message.getSenderRole().toLowerCase().contains("doctor") ? "doctor" : "patient");
        result.put("text", message.getText());
        result.put("time", message.getCreatedAt());
        return result;
    }

    private Doctor resolvePatientDoctor(Patient patient) {
        if (patient.getPrimaryDoctor() != null && !patient.getPrimaryDoctor().isBlank()) {
            Optional<Doctor> primary = doctorRepository.findByNameIgnoreCase(patient.getPrimaryDoctor().trim());
            if (primary.isPresent())
                return primary.get();
        }
        return appointmentRepository.findByPatientId(patient.getId()).stream()
                .filter(a -> a.getDoctorId() != null)
                .max(Comparator.comparing(a -> a.getId(), Comparator.nullsLast(Long::compareTo)))
                .flatMap(a -> doctorRepository.findById(a.getDoctorId()))
                .orElseThrow(() -> new NotFoundException("No doctor is associated with this patient"));
    }

    private void assertDoctorCanAccessPatient(Doctor doctor, Patient patient) {
        boolean allowed = doctor.getName().equalsIgnoreCase(Objects.toString(patient.getPrimaryDoctor(), ""))
                || appointmentRepository.findByDoctorId(doctor.getId()).stream()
                        .anyMatch(a -> Objects.equals(a.getPatientId(), patient.getId()))
                || consultationRepository.findByDoctorId(doctor.getId()).stream()
                        .anyMatch(c -> Objects.equals(c.getPatientId(), patient.getId()))
                || prescriptionRepository.findByDoctorId(doctor.getId()).stream()
                        .anyMatch(p -> Objects.equals(p.getPatientId(), patient.getId()));
        if (!allowed)
            throw new ForbiddenException("You do not have access to this patient conversation");
    }

    private Long doctorUserId(Doctor doctor) {
        return currentUserService.getUser().getId();
    }

    private Long patientUserId(Patient patient) {
        return currentUserService.getUser().getId();
    }

    private Patient getPatient(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new NotFoundException("Patient not found"));
    }
}
