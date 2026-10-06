package com.medicare.controller;

import com.medicare.entity.Consultation;
import com.medicare.entity.Patient;
import com.medicare.entity.Prescription;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.VitalLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/patients")
@Tag(name = "Doctor Patient Directory", description = "Endpoints for physicians to list, filter, search, and view patient clinical charts")
public class PatientDirectoryController {

    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final VitalLogRepository vitalLogRepository;

    public PatientDirectoryController(PatientRepository patientRepository,
                                      ConsultationRepository consultationRepository,
                                      PrescriptionRepository prescriptionRepository,
                                      VitalLogRepository vitalLogRepository) {
        this.patientRepository = patientRepository;
        this.consultationRepository = consultationRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.vitalLogRepository = vitalLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "List, search, filter and paginate patients")
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(value = "q", defaultValue = "") String q,
            @RequestParam(value = "status", defaultValue = "All") String status,
            @RequestParam(value = "sort", defaultValue = "name") String sort,
            @RequestParam(value = "dir", defaultValue = "asc") String dir,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "5") int size) {

        List<Patient> all = patientRepository.findAll();
        List<Patient> filtered = new ArrayList<>(all.stream()
                .filter(p -> "All".equalsIgnoreCase(status) || (p.getStatus() != null && p.getStatus().equalsIgnoreCase(status)))
                .filter(p -> q.isBlank() || (p.getName() != null && p.getName().toLowerCase().contains(q.toLowerCase()))
                        || (p.getPhone() != null && p.getPhone().contains(q)))
                .toList());

        // Sorting
        Comparator<Patient> comparator;
        if ("age".equalsIgnoreCase(sort)) {
            comparator = Comparator.comparing(p -> p.getAge() != null ? p.getAge() : 0);
        } else if ("lastVisit".equalsIgnoreCase(sort)) {
            comparator = Comparator.comparing(p -> p.getLastVisit() != null ? p.getLastVisit() : "");
        } else {
            comparator = Comparator.comparing(p -> p.getName() != null ? p.getName() : "");
        }

        if ("desc".equalsIgnoreCase(dir)) {
            comparator = comparator.reversed();
        }
        filtered.sort(comparator);

        int start = Math.max(0, (page - 1) * size);
        int end = Math.min(filtered.size(), start + size);
        List<Patient> items = (start < filtered.size()) ? filtered.subList(start, end) : Collections.emptyList();

        Map<String, Object> response = new HashMap<>();
        response.put("total", filtered.size());
        response.put("items", items);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Get detailed clinical snapshot, timeline, and today's consultation for a patient")
    public ResponseEntity<Map<String, Object>> getPatientDetail(@PathVariable("id") Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new com.medicare.exception.NotFoundException("Patient not found with id: " + id));

        Map<String, Object> res = new HashMap<>();
        res.put("id", patient.getId());
        res.put("name", patient.getName());
        res.put("email", patient.getEmail());
        res.put("phone", patient.getPhone());
        res.put("age", patient.getAge());
        res.put("gender", patient.getGender());
        res.put("bloodGroup", patient.getBloodGroup());
        res.put("heightCm", patient.getHeightCm());
        res.put("weightKg", patient.getWeightKg());
        res.put("bmi", patient.getBmi());
        res.put("address", patient.getAddress());
        res.put("status", patient.getStatus() != null ? patient.getStatus() : "Active");
        res.put("lastVisit", patient.getLastVisit() != null ? patient.getLastVisit() : LocalDate.now().toString());
        res.put("nextAppt", patient.getNextAppt());
        res.put("hospital", patient.getHospital());
        res.put("primaryDoctor", patient.getPrimaryDoctor());
        res.put("allergies", patient.getAllergies());
        res.put("conditions", patient.getConditions());
        res.put("meds", patient.getMeds());

        // Check for today's active or scheduled consultation
        String today = LocalDate.now().toString();
        List<Consultation> consults = consultationRepository.findByPatientId(id);
        Long todayConsultId = consults.stream()
                .filter(c -> today.equals(c.getDate()) &&
                        ("Scheduled".equalsIgnoreCase(c.getStatus()) || "In Progress".equalsIgnoreCase(c.getStatus())))
                .map(Consultation::getId)
                .findFirst()
                .orElse(null);
        res.put("todayConsultationId", todayConsultId);

        // Build timeline only from persistent clinical records.
        List<Map<String, Object>> timeline = new ArrayList<>();

        for (Consultation c : consults) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", c.getDate() != null ? c.getDate() : "Recent");
            entry.put("title", "Consultation · " + Objects.toString(c.getDoctorName(), "Doctor"));
            entry.put("desc", Objects.toString(c.getChiefComplaint(), "Clinical encounter"));
            entry.put("badge", Objects.toString(c.getStatus(), "Recorded"));
            entry.put("badgeTone", "Completed".equalsIgnoreCase(c.getStatus()) ? "green" : "In Progress".equalsIgnoreCase(c.getStatus()) ? "orange" : "blue");
            timeline.add(entry);
        }

        List<Prescription> rxList = prescriptionRepository.findByPatientId(id);
        for (Prescription rx : rxList) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", rx.getDate() != null ? rx.getDate() : "Recent");
            entry.put("title", "Prescription Issued (" + rx.getCode() + ")");
            entry.put("desc", rx.getDiagnosis() != null ? rx.getDiagnosis() : "Clinical prescription");
            entry.put("badge", Objects.toString(rx.getStatus(), "Recorded"));
            entry.put("badgeTone", "Finalized".equalsIgnoreCase(rx.getStatus()) ? "green" : "purple");
            timeline.add(entry);
        }

        vitalLogRepository.findByPatientIdOrderByMeasuredAtDesc(id).stream().limit(10).forEach(v -> {
            List<String> values = new ArrayList<>();
            if (v.getBpSys() != null && v.getBpDia() != null) values.add("BP: " + v.getBpSys() + "/" + v.getBpDia() + " mmHg");
            if (v.getHeartRate() != null) values.add("HR: " + v.getHeartRate() + " bpm");
            if (v.getSpo2() != null) values.add("SpO2: " + v.getSpo2() + "%");
            if (v.getWeightKg() != null) values.add("Weight: " + v.getWeightKg() + " kg");
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", v.getMeasuredAt());
            entry.put("title", "Home Vitals Logged");
            entry.put("desc", values.isEmpty() ? "Vital signs recorded" : String.join(" · ", values));
            entry.put("badge", "Logged");
            entry.put("badgeTone", "green");
            timeline.add(entry);
        });

        timeline.sort(Comparator.comparing(e -> Objects.toString(e.get("date"), ""), Comparator.reverseOrder()));
        res.put("timeline", timeline);
        return ResponseEntity.ok(res);
    }
}
