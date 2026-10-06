package com.medicare.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.dto.ApiResponse;
import com.medicare.entity.Appointment;
import com.medicare.entity.Consultation;
import com.medicare.entity.Doctor;
import com.medicare.entity.Role;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.security.AuthorizationService;
import com.medicare.security.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/consultations")
@Tag(
        name = "Consultations",
        description = "In-person OPD consultations and clinical encounters"
)
public class ConsultationController {

    private final ConsultationRepository consultationRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final CurrentUserService currentUserService;
    private final AuthorizationService authorizationService;
    private final ObjectMapper objectMapper;

    public ConsultationController(
            ConsultationRepository consultationRepository,
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            CurrentUserService currentUserService,
            AuthorizationService authorizationService,
            ObjectMapper objectMapper) {

        this.consultationRepository = consultationRepository;
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.currentUserService = currentUserService;
        this.authorizationService = authorizationService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(
            summary = "List doctor consultations by tab"
    )
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(
                    value = "q",
                    defaultValue = ""
            ) String q,

            @RequestParam(
                    value = "tab",
                    defaultValue = "today"
            ) String tab,

            @RequestParam(
                    value = "page",
                    defaultValue = "1"
            ) int page,

            @RequestParam(
                    value = "size",
                    defaultValue = "10"
            ) int size) {

        if (page < 1 || size < 1 || size > 100) {
            throw new ValidationException(
                    "page must be >= 1 and size must be between 1 and 100"
            );
        }

        Role role =
                currentUserService
                        .getUser()
                        .getRole();

        List<Consultation> all;

        if (role == Role.ROLE_ADMIN) {

            all = consultationRepository.findAll();

        } else {

            Doctor doctor =
                    currentUserService.getCurrentDoctor();

            all =
                    consultationRepository
                            .findByDoctorId(
                                    doctor.getId()
                            );
        }

        String normalizedQuery =
                q.trim().toLowerCase();

        LocalDate today =
                LocalDate.now();

        List<Consultation> filtered =
                all.stream()
                        .filter(c ->
                                matchesTab(
                                        c,
                                        tab,
                                        today
                                )
                        )
                        .filter(c ->
                                normalizedQuery.isBlank()
                                        ||
                                (
                                        c.getPatientName() != null
                                        &&
                                        c.getPatientName()
                                                .toLowerCase()
                                                .contains(
                                                        normalizedQuery
                                                )
                                )
                        )
                        .toList();

        int start =
                Math.max(
                        0,
                        (page - 1) * size
                );

        int end =
                Math.min(
                        filtered.size(),
                        start + size
                );

        List<Consultation> items =
                start < filtered.size()
                        ? filtered.subList(
                                start,
                                end
                        )
                        : Collections.emptyList();

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "total",
                filtered.size()
        );

        response.put(
                "items",
                items
        );

        return ResponseEntity.ok(
                response
        );
    }

    @GetMapping("/{id}")
    @PreAuthorize(
            "hasAnyRole('DOCTOR', 'ADMIN', 'PATIENT')"
    )
    @Operation(
            summary = "Get consultation details"
    )
    public ResponseEntity<Map<String, Object>> get(
            @PathVariable Long id) {

        Consultation c =
                consultationRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new NotFoundException(
                                        "Consultation not found"
                                )
                        );

        authorizationService.checkConsultationAccess(c);

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "id",
                c.getId()
        );

        response.put(
                "appointmentId",
                c.getAppointmentId()
        );

        response.put(
                "doctorId",
                c.getDoctorId()
        );

        response.put(
                "doctorName",
                c.getDoctorName()
        );

        response.put(
                "patientId",
                c.getPatientId()
        );

        response.put(
                "patientName",
                c.getPatientName()
        );

        response.put(
                "patient",
                c.getPatientName()
        );

        response.put(
                "date",
                c.getDate()
        );

        response.put(
                "time",
                c.getTime()
        );

        response.put(
                "type",
                c.getType()
        );

        response.put(
                "status",
                c.getStatus()
        );

        response.put(
                "room",
                c.getRoom()
        );

        response.put(
                "chiefComplaint",
                c.getChiefComplaint()
        );

        response.put(
                "doctorNotes",
                c.getDoctorNotes()
        );

        response.put(
                "keyTakeaway",
                c.getKeyTakeaway()
        );

        response.put(
                "vitalsAtVisit",
                c.getVitalsAtVisit()
        );

        response.put(
                "patientInstructions",
                c.getPatientInstructions()
        );

        response.put(
                "form",
                readJsonMap(
                        c.getClinicalFormJson()
                )
        );

        response.put(
                "ai",
                readJsonObject(
                        c.getAiStateJson()
                )
        );

        if (c.getPatientId() != null) {

            patientRepository
                    .findById(
                            c.getPatientId()
                    )
                    .ifPresent(
                            patient ->
                                    response.put(
                                            "patientInfo",
                                            patient
                                    )
                    );
        }

        return ResponseEntity.ok(
                response
        );
    }

    /*
     * ----------------------------------------------------
     * START CONSULTATION
     * ----------------------------------------------------
     *
     * IMPORTANT:
     * This method NEVER creates an Appointment.
     *
     * It changes the existing:
     *
     *     Consultation -> In Progress
     *
     * and the linked:
     *
     *     Appointment  -> In Progress
     *
     */
    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(
            summary = "Start scheduled consultation"
    )
    @Transactional
    public ResponseEntity<ApiResponse> start(
            @PathVariable Long id) {

        Consultation consultation =
                consultationRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new NotFoundException(
                                        "Consultation not found"
                                )
                        );

        Doctor currentDoctor = currentUserService.getCurrentDoctor();
        Appointment appointment = findExistingAppointment(consultation);

        // Repair legacy consultations before authorization. New bookings already
        // carry doctorId + appointmentId and follow the same path without creating
        // any additional Appointment record.
        if (consultation.getDoctorId() == null && appointment != null && appointment.getDoctorId() != null) {
            consultation.setDoctorId(appointment.getDoctorId());
            consultation.setDoctorName(appointment.getDoctor());
        }
        if (consultation.getAppointmentId() == null && appointment != null) {
            consultation.setAppointmentId(appointment.getId());
        }

        authorizationService.checkDoctorOwnsConsultation(consultation);

        if ("Completed".equalsIgnoreCase(
                consultation.getStatus()
        )) {

            throw new ValidationException(
                    "Completed consultations cannot be started"
            );
        }

        if ("Cancelled".equalsIgnoreCase(
                consultation.getStatus()
        )) {

            throw new ValidationException(
                    "Cancelled consultations cannot be started"
            );
        }

        /*
         * ------------------------------------------------
         * FIND THE EXISTING APPOINTMENT
         * ------------------------------------------------
         */

        /*
         * ------------------------------------------------
         * UPDATE CONSULTATION
         * ------------------------------------------------
         */

        consultation.setStatus(
                "In Progress"
        );

        /*
         * If this is an old consultation that did not
         * previously have appointmentId, repair the link.
         */
        if (appointment != null
                && consultation.getAppointmentId() == null) {

            consultation.setAppointmentId(
                    appointment.getId()
            );
        }

        consultationRepository.save(
                consultation
        );

        /*
         * ------------------------------------------------
         * UPDATE EXISTING APPOINTMENT
         * ------------------------------------------------
         *
         * NEVER create a new Appointment here.
         */
        if (appointment != null) {

            appointment.setStatus(
                    "In Progress"
            );

            appointmentRepository.save(
                    appointment
            );
        }

        return ResponseEntity.ok(
                new ApiResponse(
                        true,
                        "Consultation started"
                )
        );
    }

    /*
     * ----------------------------------------------------
     * SAVE / COMPLETE CONSULTATION
     * ----------------------------------------------------
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(
            summary = "Save or complete consultation notes"
    )
    @Transactional
    public ResponseEntity<ApiResponse> save(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        Consultation c =
                consultationRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new NotFoundException(
                                        "Consultation not found"
                                )
                        );

        authorizationService
                .checkDoctorOwnsConsultation(c);

        if ("Completed".equalsIgnoreCase(
                c.getStatus()
        )) {

            throw new ValidationException(
                    "Completed consultations cannot be edited"
            );
        }

        if (body.containsKey("status")) {

            String requestedStatus =
                    String.valueOf(
                            body.get("status")
                    );

            if (!List.of(
                    "Scheduled",
                    "In Progress",
                    "Completed",
                    "Cancelled"
            ).contains(requestedStatus)) {

                throw new ValidationException(
                        "Invalid consultation status"
                );
            }

            c.setStatus(
                    requestedStatus
            );
        }

        if (body.containsKey("doctorNotes")) {

            c.setDoctorNotes(
                    (String)
                            body.get(
                                    "doctorNotes"
                            )
            );
        }

        if (body.containsKey("form")) {

            Object rawForm =
                    body.get("form");

            if (!(rawForm instanceof Map<?, ?>)) {

                throw new ValidationException(
                        "form must be an object"
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> form =
                    (Map<String, Object>) rawForm;

            if (form.containsKey("notes")) {

                c.setDoctorNotes(
                        asString(
                                form.get("notes")
                        )
                );
            }

            if (form.containsKey("takeaway")) {

                c.setKeyTakeaway(
                        asString(
                                form.get("takeaway")
                        )
                );
            }

            c.setClinicalFormJson(
                    writeJson(form)
            );
        }

        if (body.containsKey("ai")) {

            c.setAiStateJson(
                    writeJson(
                            body.get("ai")
                    )
            );
        }

        consultationRepository.save(c);

        /*
         * Keep the already-existing appointment in sync.
         */
        if (c.getAppointmentId() != null
                && body.containsKey("status")) {

            appointmentRepository
                    .findById(
                            c.getAppointmentId()
                    )
                    .ifPresent(
                            appointment -> {

                                appointment.setStatus(
                                        c.getStatus()
                                );

                                appointmentRepository.save(
                                        appointment
                                );
                            }
                    );
        }

        return ResponseEntity.ok(
                new ApiResponse(
                        true,
                        "Consultation saved"
                )
        );
    }

    /*
     * ----------------------------------------------------
     * FIND EXISTING APPOINTMENT
     * ----------------------------------------------------
     *
     * First use appointmentId.
     *
     * For old consultations created before appointmentId
     * was introduced, fall back to doctor + patient +
     * date + time.
     */
    private Appointment findExistingAppointment(
            Consultation consultation) {

        /*
         * Best case:
         * consultation already has appointmentId.
         */
        if (consultation.getAppointmentId() != null) {

            return appointmentRepository
                    .findById(
                            consultation.getAppointmentId()
                    )
                    .orElse(null);
        }

        /*
         * Fallback for old records.
         */
        if (consultation.getPatientId() == null
                || consultation.getDate() == null
                || consultation.getTime() == null) {

            return null;
        }

        /*
         * If doctorId exists, use the strongest lookup.
         */
        if (consultation.getDoctorId() != null) {

            Optional<Appointment> appointment =
                    appointmentRepository
                            .findFirstByDoctorIdAndPatientIdAndDateAndTimeOrderByIdDesc(
                                    consultation.getDoctorId(),
                                    consultation.getPatientId(),
                                    consultation.getDate(),
                                    consultation.getTime()
                            );

            if (appointment.isPresent()) {
                return appointment.get();
            }
        }

        /*
         * Older appointments may have doctorId = NULL.
         * Match by patient/date/time and then doctor name.
         */
        List<Appointment> candidates =
                appointmentRepository
                        .findByPatientIdAndDateAndTime(
                                consultation.getPatientId(),
                                consultation.getDate(),
                                consultation.getTime()
                        );

        for (Appointment appointment : candidates) {

            boolean doctorMatches =
                    consultation.getDoctorName() == null
                            ||
                    appointment.getDoctor() == null
                            ||
                    consultation
                            .getDoctorName()
                            .equalsIgnoreCase(
                                    appointment.getDoctor()
                            );

            boolean validStatus =
                    !"Cancelled".equalsIgnoreCase(
                            appointment.getStatus()
                    )
                            &&
                    !"Completed".equalsIgnoreCase(
                            appointment.getStatus()
                    );

            if (doctorMatches && validStatus) {
                return appointment;
            }
        }

        return null;
    }

    private String writeJson(
            Object value) {

        try {

            return objectMapper.writeValueAsString(
                    value
            );

        } catch (JsonProcessingException ex) {

            throw new ValidationException(
                    "Unable to persist consultation draft"
            );
        }
    }

    private Map<String, Object> readJsonMap(
            String json) {

        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }

        try {

            return objectMapper.readValue(
                    json,
                    new TypeReference<Map<String, Object>>() {}
            );

        } catch (JsonProcessingException ex) {

            return Collections.emptyMap();
        }
    }

    private Object readJsonObject(
            String json) {

        if (json == null || json.isBlank()) {
            return null;
        }

        try {

            return objectMapper.readValue(
                    json,
                    Object.class
            );

        } catch (JsonProcessingException ex) {

            return null;
        }
    }

    private String asString(
            Object value) {

        return value == null
                ? null
                : String.valueOf(value);
    }

    private boolean matchesTab(
            Consultation c,
            String tab,
            LocalDate today) {

        String dateValue =
                c.getDate();

        LocalDate date;

        try {

            date =
                    LocalDate.parse(
                            dateValue
                    );

        } catch (Exception ex) {

            return false;
        }

        return switch (
                tab.toLowerCase()
        ) {

            case "today" ->
                    date.equals(today);

            case "upcoming" ->
                    date.isAfter(today)
                            &&
                    !"Completed".equalsIgnoreCase(
                            c.getStatus()
                    )
                            &&
                    !"Cancelled".equalsIgnoreCase(
                            c.getStatus()
                    );

            case "past", "completed" ->
                    date.isBefore(today)
                            ||
                    "Completed".equalsIgnoreCase(
                            c.getStatus()
                    )
                            ||
                    "Cancelled".equalsIgnoreCase(
                            c.getStatus()
                    );

            default ->
                    throw new ValidationException(
                            "Invalid consultation tab: "
                                    + tab
                    );
        };
    }
}