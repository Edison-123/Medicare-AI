package com.medicare.service;

import com.medicare.dto.AdminCreatePatientRequest;
import com.medicare.dto.ApiResponse;
import com.medicare.dto.PatientRegistrationResponse;
import com.medicare.entity.*;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.*;
import com.medicare.security.CurrentUserService;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class AdminService {

        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final HospitalRepository hospitalRepository;
        private final SystemLogRepository systemLogRepository;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final PrescriptionRepository prescriptionRepository;
        private final AppointmentRepository appointmentRepository;
        private final ConsultationRepository consultationRepository;
        private final UserSettingsService userSettingsService;
        private final CurrentUserService currentUserService;
        private final Environment environment;

        @org.springframework.beans.factory.annotation.Value("${medicare.auth.max-failed-logins:5}")
        private int maxFailedLogins;
        @org.springframework.beans.factory.annotation.Value("${medicare.auth.lockout-duration-minutes:15}")
        private int lockoutDurationMinutes;

        public AdminService(DoctorRepository doctorRepository,
                        PatientRepository patientRepository,
                        HospitalRepository hospitalRepository,
                        SystemLogRepository systemLogRepository,
                        UserRepository userRepository,
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
                Map<String, Object> result = new LinkedHashMap<>();
                long consultationCount = consultationRepository.count();
                result.put("kpis", List.of(
                                Map.of("key", "doctors", "label", "Registered Doctors", "value",
                                                doctorRepository.count(), "tone", "blue"),
                                Map.of("key", "patients", "label", "Active Patients", "value",
                                                patientRepository.findAll().stream()
                                                                .filter(p -> "Active".equalsIgnoreCase(p.getStatus()))
                                                                .count(),
                                                "tone", "green"),
                                Map.of("key", "hospitals", "label", "Partner Hospitals", "value",
                                                hospitalRepository.count(), "tone", "purple"),
                                Map.of("key", "prescriptions", "label", "Prescriptions Issued", "value",
                                                prescriptionRepository.count(), "tone", "orange")));

                Map<String, Object> systemHealth = new LinkedHashMap<>();
                systemHealth.put("uptime", "Not measured");
                systemHealth.put("apiLatencyMs", null);
                systemHealth.put("aiInferenceSec", null);
                systemHealth.put("dbConnections", "Managed by datasource pool");
                systemHealth.put("storageUsedPercent", null);
                systemHealth.put("status", "Operational");
                result.put("systemHealth", systemHealth);

                List<Appointment> appointments = appointmentRepository.findAll();
                result.put("hospitalDistribution", hospitalRepository.findAll().stream().map(hospital -> {
                        long consults = appointments.stream()
                                        .filter(a -> Objects.equals(a.getHospital(), hospital.getName())).count();
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("name", hospital.getName());
                        item.put("code", hospital.getCode());
                        item.put("consults", consults);
                        item.put("share",
                                        consultationCount == 0 ? 0 : Math.round(consults * 100.0 / consultationCount));
                        item.put("status", hospital.getStatus() == null ? "Unknown" : hospital.getStatus());
                        return item;
                }).sorted(Comparator.comparingLong(
                                (Map<String, Object> item) -> ((Number) item.get("consults")).longValue()).reversed())
                                .toList());

                result.put("recentActivities", systemLogRepository.findAllByOrderByTimestampDesc().stream().limit(5)
                                .map(log -> {
                                        Map<String, Object> item = new LinkedHashMap<>();
                                        item.put("id", log.getId());
                                        item.put("type", log.getComponent());
                                        item.put("level", log.getLevel());
                                        item.put("title", log.getMessage());
                                        item.put("desc", log.getMessage());
                                        item.put("time", log.getTimestamp());
                                        return item;
                                }).toList());

                result.put("pendingDoctorApprovals", doctorRepository.findByStatus("Pending").stream().map(doctor -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", doctor.getId());
                        item.put("name", doctor.getName());
                        item.put("email", doctor.getEmail());
                        item.put("specialization", doctor.getSpecialization());
                        item.put("license", doctor.getLicenseNumber());
                        item.put("hospital", doctor.getHospital());
                        item.put("profilePicture", doctor.getProfilePicture() != null ? doctor.getProfilePicture()
                                        : userRepository.findByEmailIgnoreCase(doctor.getEmail())
                                                        .map(User::getProfilePicture).orElse(null));
                        item.put("submitted", "Not recorded");
                        return item;
                }).sorted(Comparator.comparing((Map<String, Object> item) -> Objects.toString(item.get("name"), ""),
                                String.CASE_INSENSITIVE_ORDER)).toList());
                return result;
        }

        public List<Doctor> getDoctors(String query, String department, String status) {
                String normalizedQuery = normalize(query);
                String normalizedDepartment = department == null ? "All" : department.trim();
                String normalizedStatus = status == null ? "All" : status.trim();
                if ("Pending Approval".equalsIgnoreCase(normalizedStatus))
                        normalizedStatus = "Pending";
                final String statusFilter = normalizedStatus;
                return doctorRepository.findAll().stream()
                                .filter(doctor -> normalizedQuery.isEmpty()
                                                || containsIgnoreCase(doctor.getName(), normalizedQuery)
                                                || containsIgnoreCase(doctor.getEmail(), normalizedQuery)
                                                || containsIgnoreCase(doctor.getLicenseNumber(), normalizedQuery)
                                                || containsIgnoreCase(doctor.getHospital(), normalizedQuery)
                                                || containsIgnoreCase(doctor.getSpecialization(), normalizedQuery))
                                .filter(doctor -> "All".equalsIgnoreCase(normalizedDepartment)
                                                || containsIgnoreCase(doctor.getSpecialization(), normalizedDepartment))
                                .filter(doctor -> "All".equalsIgnoreCase(statusFilter)
                                                || statusFilter.equalsIgnoreCase(doctor.getStatus()))
                                .peek(doctor -> doctor.setConsultsCount(
                                                consultationRepository.findByDoctorId(doctor.getId()).stream()
                                                                .count()))
                                .sorted(Comparator.comparingInt((Doctor doctor) -> doctorStatusRank(doctor.getStatus()))
                                                .thenComparing(Doctor::getName,
                                                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                                .toList();
        }

        @Transactional
        public Doctor addDoctor(Doctor doctor) {
                if (doctor.getEmail() == null || doctor.getEmail().isBlank()) {
                        throw new ValidationException("Doctor email is required");
                }
                String email = doctor.getEmail().trim().toLowerCase(Locale.ROOT);
                if (userRepository.existsByEmailIgnoreCase(email)
                                || doctorRepository.findByEmailIgnoreCase(email).isPresent()) {
                        throw new ValidationException("A user with this email already exists");
                }
                if (doctor.getStatus() == null)
                        doctor.setStatus("Active");
                if (doctor.getRating() == null)
                        doctor.setRating(5.0);
                doctor.setEmail(email);

                String seedPassword = environment.getRequiredProperty("SEED_USER_PASSWORD");
                if (seedPassword.isBlank()) {
                        throw new ValidationException("SEED_USER_PASSWORD must be configured before adding a doctor");
                }
                User user = new User(email, passwordEncoder.encode(seedPassword),
                                doctor.getName() == null ? "Doctor" : doctor.getName().trim(), "Doctor",
                                Role.ROLE_DOCTOR);
                userRepository.save(user);
                return doctorRepository.save(doctor);
        }

        @Transactional
        public Doctor updateDoctor(Long id, Doctor incoming) {
                Doctor doctor = doctorRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Doctor not found"));

                final String previousDoctorName = doctor.getName();
                final String nextDoctorName = incoming.getName() == null ? previousDoctorName
                                : incoming.getName().trim();
                if (nextDoctorName == null || nextDoctorName.isBlank()) {
                        throw new ValidationException("Doctor name is required");
                }

                String previousEmail = doctor.getEmail();
                String nextEmail = incoming.getEmail() == null ? previousEmail : incoming.getEmail().trim();
                if (nextEmail == null || nextEmail.isBlank()) {
                        throw new ValidationException("Doctor email is required");
                }
                nextEmail = nextEmail.toLowerCase(Locale.ROOT);

                if (!Objects.equals(previousEmail, nextEmail)) {
                        Optional<Doctor> existingSameEmail = doctorRepository.findByEmailIgnoreCase(nextEmail);
                        if (existingSameEmail.isPresent() && !Objects.equals(existingSameEmail.get().getId(), id)) {
                                throw new ValidationException("A user with this email already exists");
                        }
                }

                doctor.setName(nextDoctorName);
                doctor.setEmail(nextEmail);
                doctor.setSpecialization(incoming.getSpecialization() == null ? doctor.getSpecialization()
                                : incoming.getSpecialization().trim());
                doctor.setHospital(
                                incoming.getHospital() == null ? doctor.getHospital() : incoming.getHospital().trim());
                doctor.setPhone(incoming.getPhone() == null ? doctor.getPhone() : incoming.getPhone());
                doctor.setLicenseNumber(incoming.getLicenseNumber() == null ? doctor.getLicenseNumber()
                                : incoming.getLicenseNumber().trim());
                doctor.setExperienceYears(incoming.getExperienceYears() == null ? doctor.getExperienceYears()
                                : incoming.getExperienceYears());
                doctor.setStatus(incoming.getStatus() == null ? doctor.getStatus() : incoming.getStatus());
                if (incoming.getRating() != null) {
                        doctor.setRating(incoming.getRating());
                }

                final String previousDoctorEmail = previousEmail;
                final String updatedDoctorEmail = nextEmail;
                final String updatedDoctorName = doctor.getName();

                if (!Objects.equals(previousDoctorEmail, updatedDoctorEmail)) {
                        userRepository.findByEmailIgnoreCase(previousDoctorEmail).ifPresent(user -> {
                                user.setEmail(updatedDoctorEmail);
                                user.setName(updatedDoctorName);
                                userRepository.save(user);
                        });
                } else {
                        userRepository.findByEmailIgnoreCase(updatedDoctorEmail).ifPresent(user -> {
                                user.setName(updatedDoctorName);
                                userRepository.save(user);
                        });
                }

                if (!Objects.equals(previousDoctorName, updatedDoctorName)) {
                        patientRepository.findAll().forEach(patient -> {
                                String assignedDoctor = patient.getPrimaryDoctor();
                                if (assignedDoctor != null && assignedDoctor.equalsIgnoreCase(previousDoctorName)) {
                                        patient.setPrimaryDoctor(updatedDoctorName);
                                        patientRepository.save(patient);
                                }
                        });
                }

                return doctorRepository.save(doctor);
        }

        public Doctor updateDoctorStatus(Long id, String status) {
                Doctor doctor = doctorRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Doctor not found"));
                doctor.setStatus(status);
                return doctorRepository.save(doctor);
        }

        public List<Patient> getPatients(String query, String hospital, String riskCategory) {
                String normalizedQuery = normalize(query);
                String normalizedHospital = hospital == null ? "All" : hospital.trim();
                String normalizedRisk = riskCategory == null ? "All" : riskCategory.trim();
                String normalizedHospitalFilter = normalize(normalizedHospital);
                String normalizedRiskFilter = normalize(normalizedRisk);
                return patientRepository.findAll().stream()
                                .filter(patient -> normalizedQuery.isEmpty()
                                                || containsIgnoreCase(patient.getName(), normalizedQuery)
                                                || containsIgnoreCase(patient.getEmail(), normalizedQuery)
                                                || containsIgnoreCase(patient.getPhone(), normalizedQuery)
                                                || String.valueOf(patient.getId()).contains(normalizedQuery))
                                .filter(patient -> "all".equals(normalizedHospitalFilter)
                                                || normalize(patient.getHospital()).equals(normalizedHospitalFilter))
                                .filter(patient -> "all".equals(normalizedRiskFilter)
                                                || normalize(patient.getRiskCategory()).equals(normalizedRiskFilter))
                                .sorted(Comparator.comparing(Patient::getId,
                                                Comparator.nullsLast(Comparator.naturalOrder())))
                                .toList();
        }

        @Transactional
        public PatientRegistrationResponse registerPatient(AdminCreatePatientRequest request) {
                String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
                if (userRepository.existsByEmailIgnoreCase(email)
                                || patientRepository.findByEmailIgnoreCase(email).isPresent()) {
                        throw new ValidationException("A user with this email already exists");
                }
                String status = request.getStatus() == null || request.getStatus().isBlank()
                                ? "Active"
                                : request.getStatus().trim();
                User user = new User(email, passwordEncoder.encode(request.getPassword()),
                                request.getName().trim(), "Patient", Role.ROLE_PATIENT);
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

                return new PatientRegistrationResponse(user.getId(), patient.getId(), patient.getName(),
                                patient.getEmail(),
                                Role.ROLE_PATIENT.name(), patient.getStatus(), "Patient registered successfully");
        }

        @Transactional
        public Patient updatePatient(Long id, Patient incoming) {
                Patient patient = patientRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Patient not found"));

                String previousEmail = patient.getEmail();
                String nextEmail = incoming.getEmail() == null ? previousEmail : incoming.getEmail().trim();
                if (nextEmail == null || nextEmail.isBlank()) {
                        throw new ValidationException("Patient email is required");
                }
                nextEmail = nextEmail.toLowerCase(Locale.ROOT);

                if (!Objects.equals(previousEmail, nextEmail)) {
                        Optional<Patient> existingSameEmail = patientRepository.findByEmailIgnoreCase(nextEmail);
                        if (existingSameEmail.isPresent() && !Objects.equals(existingSameEmail.get().getId(), id)) {
                                throw new ValidationException("A user with this email already exists");
                        }
                }

                patient.setName(incoming.getName() == null ? patient.getName() : incoming.getName().trim());
                patient.setEmail(nextEmail);
                patient.setPhone(incoming.getPhone() == null ? patient.getPhone() : incoming.getPhone());
                patient.setDob(incoming.getDob() == null ? patient.getDob() : incoming.getDob());
                patient.setAge(incoming.getAge() == null ? patient.getAge() : incoming.getAge());
                patient.setGender(incoming.getGender() == null ? patient.getGender() : incoming.getGender());
                patient.setBloodGroup(
                                incoming.getBloodGroup() == null ? patient.getBloodGroup() : incoming.getBloodGroup());
                patient.setHeightCm(incoming.getHeightCm() == null ? patient.getHeightCm() : incoming.getHeightCm());
                patient.setWeightKg(incoming.getWeightKg() == null ? patient.getWeightKg() : incoming.getWeightKg());
                patient.setBmi(incoming.getBmi() == null ? patient.getBmi() : incoming.getBmi());
                patient.setAddress(incoming.getAddress() == null ? patient.getAddress() : incoming.getAddress());
                patient.setHealthCardNumber(incoming.getHealthCardNumber() == null ? patient.getHealthCardNumber()
                                : incoming.getHealthCardNumber());
                patient.setInsuranceProvider(incoming.getInsuranceProvider() == null ? patient.getInsuranceProvider()
                                : incoming.getInsuranceProvider());
                patient.setInsurancePolicy(incoming.getInsurancePolicy() == null ? patient.getInsurancePolicy()
                                : incoming.getInsurancePolicy());
                patient.setRiskCategory(incoming.getRiskCategory() == null ? patient.getRiskCategory()
                                : incoming.getRiskCategory());
                patient.setStatus(incoming.getStatus() == null ? patient.getStatus() : incoming.getStatus());
                patient.setHospital(incoming.getHospital() == null ? patient.getHospital() : incoming.getHospital());
                patient.setPrimaryDoctor(incoming.getPrimaryDoctor() == null ? patient.getPrimaryDoctor()
                                : incoming.getPrimaryDoctor());

                final String previousPatientEmail = previousEmail;
                final String updatedPatientEmail = nextEmail;
                final String updatedPatientName = patient.getName();

                if (!Objects.equals(previousPatientEmail, updatedPatientEmail)) {
                        userRepository.findByEmailIgnoreCase(previousPatientEmail).ifPresent(user -> {
                                user.setEmail(updatedPatientEmail);
                                user.setName(updatedPatientName);
                                userRepository.save(user);
                        });
                } else {
                        userRepository.findByEmailIgnoreCase(updatedPatientEmail).ifPresent(user -> {
                                user.setName(updatedPatientName);
                                userRepository.save(user);
                        });
                }

                return patientRepository.save(patient);
        }

        public Patient updatePatientStatus(Long id, String status) {
                Patient patient = patientRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Patient not found"));
                patient.setStatus(status);
                return patientRepository.save(patient);
        }

        public List<Hospital> getHospitals(String query, String status) {
                String normalizedQuery = normalize(query);
                String normalizedStatus = status == null || status.isBlank() ? "All" : status.trim();
                List<Patient> patients = patientRepository.findAll();
                List<Doctor> doctors = doctorRepository.findAll();
                return hospitalRepository.findAll().stream()
                                .filter(hospital -> "All".equalsIgnoreCase(normalizedStatus)
                                                || normalizedStatus.equalsIgnoreCase(hospital.getStatus()))
                                .filter(hospital -> normalizedQuery.isEmpty()
                                                || containsIgnoreCase(hospital.getName(), normalizedQuery)
                                                || containsIgnoreCase(hospital.getCode(), normalizedQuery)
                                                || containsIgnoreCase(hospital.getCity(), normalizedQuery))
                                .sorted(Comparator.comparing(Hospital::getName,
                                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                                .map(hospital -> {
                                        List<Doctor> assignedDoctors = doctors.stream()
                                                        .filter(doctor -> doctor.getHospital() != null
                                                                        && hospital.getName() != null
                                                                        && doctor.getHospital().trim().equalsIgnoreCase(
                                                                                        hospital.getName().trim()))
                                                        .toList();
                                        long patientCount = patients.stream()
                                                        .filter(patient -> patient.getHospital() != null
                                                                        && hospital.getName() != null
                                                                        && patient.getHospital().trim()
                                                                                        .equalsIgnoreCase(
                                                                                                        hospital.getName()
                                                                                                                        .trim()))
                                                        .count();
                                        hospital.setPatientCount(patientCount);
                                        hospital.setDoctorCount((long) assignedDoctors.size());
                                        long departmentCount = assignedDoctors.stream()
                                                        .map(Doctor::getSpecialization)
                                                        .filter(specialization -> specialization != null
                                                                        && !specialization.isBlank())
                                                        .map(specialization -> specialization.trim()
                                                                        .toLowerCase(Locale.ROOT))
                                                        .distinct()
                                                        .count();
                                        hospital.setDepartmentCount(departmentCount);
                                        return hospital;
                                })
                                .toList();
        }

        public Hospital addHospital(Hospital hospital) {
                if (hospital.getStatus() == null)
                        hospital.setStatus("Active");
                if (hospital.getApiStatus() == null)
                        hospital.setApiStatus("Not tested");
                return hospitalRepository.save(hospital);
        }

        @Transactional
        public Hospital updateHospital(Long id, Hospital incoming) {
                Hospital hospital = hospitalRepository.findById(id)
                                .orElseThrow(() -> new NotFoundException("Hospital not found"));
                if (incoming.getName() == null || incoming.getName().isBlank()) {
                        throw new ValidationException("Hospital name is required");
                }
                if (incoming.getCode() == null || incoming.getCode().isBlank()) {
                        throw new ValidationException("Hospital code is required");
                }

                String previousName = hospital.getName();
                String updatedName = incoming.getName().trim();
                hospital.setName(updatedName);
                hospital.setCode(incoming.getCode().trim());
                hospital.setType(incoming.getType() == null ? hospital.getType() : incoming.getType().trim());
                hospital.setCity(incoming.getCity() == null ? hospital.getCity() : incoming.getCity().trim());
                hospital.setAddress(
                                incoming.getAddress() == null ? hospital.getAddress() : incoming.getAddress().trim());
                hospital.setDirector(incoming.getDirector() == null ? hospital.getDirector()
                                : incoming.getDirector().trim());
                hospital.setComplianceCert(incoming.getComplianceCert() == null ? hospital.getComplianceCert()
                                : incoming.getComplianceCert().trim());
                hospital.setStatus(incoming.getStatus() == null ? hospital.getStatus() : incoming.getStatus().trim());

                if (!Objects.equals(previousName, updatedName)) {
                        List<Doctor> assignedDoctors = doctorRepository.findAll().stream()
                                        .filter(doctor -> doctor.getHospital() != null && previousName != null
                                                        && doctor.getHospital().trim()
                                                                        .equalsIgnoreCase(previousName.trim()))
                                        .peek(doctor -> doctor.setHospital(updatedName))
                                        .toList();
                        doctorRepository.saveAll(assignedDoctors);

                        List<Patient> assignedPatients = patientRepository.findAll().stream()
                                        .filter(patient -> patient.getHospital() != null && previousName != null
                                                        && patient.getHospital().trim()
                                                                        .equalsIgnoreCase(previousName.trim()))
                                        .peek(patient -> patient.setHospital(updatedName))
                                        .toList();
                        patientRepository.saveAll(assignedPatients);
                }

                return hospitalRepository.save(hospital);
        }

        @Transactional
        public ApiResponse deleteHospital(Long id) {
                Hospital hospital = hospitalRepository.findById(id)
                                .orElseThrow(() -> new NotFoundException("Hospital not found"));
                String hospitalName = hospital.getName();

                List<Doctor> assignedDoctors = doctorRepository.findAll().stream()
                                .filter(doctor -> doctor.getHospital() != null && hospitalName != null
                                                && doctor.getHospital().trim().equalsIgnoreCase(hospitalName.trim()))
                                .toList();
                assignedDoctors.forEach(doctor -> doctor.setStatus("Inactive"));
                doctorRepository.saveAll(assignedDoctors);

                List<Patient> assignedPatients = patientRepository.findAll().stream()
                                .filter(patient -> patient.getHospital() != null && hospitalName != null
                                                && patient.getHospital().trim().equalsIgnoreCase(hospitalName.trim()))
                                .toList();
                assignedPatients.forEach(patient -> patient.setStatus("Inactive"));
                patientRepository.saveAll(assignedPatients);

                hospitalRepository.delete(hospital);
                return new ApiResponse(true, "Hospital deleted; assigned doctors and patients deactivated");
        }

        public List<Map<String, Object>> getPrescriptionsAudit(String query, String flag, String status) {
                String normalizedQuery = normalize(query);
                String normalizedFlag = flag == null ? "All" : flag.trim();
                String normalizedStatus = status == null ? "All" : status.trim();
                return prescriptionRepository.findAll().stream()
                                .sorted(Comparator.comparing(Prescription::getId,
                                                Comparator.nullsLast(Comparator.reverseOrder())))
                                .map(rx -> {
                                        Map<String, Object> item = new LinkedHashMap<>();
                                        item.put("id", rx.getId());
                                        item.put("code", rx.getCode());
                                        item.put("doctor", rx.getDoctor());
                                        item.put("patient", rx.getPatient());
                                        item.put("hospital", rx.getHospital());
                                        item.put("date", rx.getDate());
                                        item.put("diagnosis", rx.getDiagnosis());
                                        item.put("medsCount", rx.getItems() == null ? 0 : rx.getItems().size());
                                        boolean hasWarning = rx.getNotes() != null
                                                        && rx.getNotes().toLowerCase(Locale.ROOT).contains("warning");
                                        item.put("aiAssisted", hasWarning);
                                        item.put("safetyFlag", hasWarning ? rx.getNotes() : "Verified Safe");
                                        item.put("status", rx.getStatus());
                                        item.put("auditHash", rx.getQrVerification());
                                        return item;
                                }).filter(item -> normalizedQuery.isEmpty()
                                                || containsIgnoreCase(String.valueOf(item.get("code")), normalizedQuery)
                                                || containsIgnoreCase(String.valueOf(item.get("doctor")),
                                                                normalizedQuery)
                                                || containsIgnoreCase(String.valueOf(item.get("patient")),
                                                                normalizedQuery)
                                                || containsIgnoreCase(String.valueOf(item.get("hospital")),
                                                                normalizedQuery)
                                                || containsIgnoreCase(String.valueOf(item.get("diagnosis")),
                                                                normalizedQuery))
                                .filter(item -> "All".equalsIgnoreCase(normalizedStatus)
                                                || normalizedStatus
                                                                .equalsIgnoreCase(String.valueOf(item.get("status"))))
                                .filter(item -> matchesAuditFlag(normalizedFlag, item))
                                .toList();
        }

        private boolean matchesAuditFlag(String flag, Map<String, Object> item) {
                if ("All".equalsIgnoreCase(flag))
                        return true;
                String safetyFlag = String.valueOf(item.get("safetyFlag"));
                String status = String.valueOf(item.get("status"));
                if ("Verified Safe".equalsIgnoreCase(flag))
                        return "Verified Safe".equalsIgnoreCase(safetyFlag);
                if ("AI Drug Interaction Warning".equalsIgnoreCase(flag))
                        return containsIgnoreCase(safetyFlag, "warning");
                if ("Age & Renal Dose Alert".equalsIgnoreCase(flag)) {
                        return containsIgnoreCase(safetyFlag, "age") || containsIgnoreCase(safetyFlag, "renal")
                                        || containsIgnoreCase(safetyFlag, "dose");
                }
                if ("Cancelled by Doctor".equalsIgnoreCase(flag))
                        return "Cancelled".equalsIgnoreCase(status);
                return true;
        }

        public Map<String, Object> getReports(String timeframe) {
                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusDays(reportPeriodDays(timeframe) - 1L);
                List<Consultation> consultations = consultationRepository.findAll().stream()
                                .filter(c -> isWithinPeriod(c.getDate(), startDate, endDate)).toList();
                List<Prescription> prescriptions = prescriptionRepository.findAll().stream()
                                .filter(p -> isWithinPeriod(p.getDate(), startDate, endDate)).toList();
                long completed = consultations.stream().filter(c -> "Completed".equalsIgnoreCase(c.getStatus()))
                                .count();
                long aiAssisted = consultations.stream()
                                .filter(c -> c.getAiStateJson() != null && !c.getAiStateJson().isBlank()).count();
                long allergyAlerts = prescriptions.stream()
                                .filter(p -> p.getNotes() != null
                                                && p.getNotes().toLowerCase(Locale.ROOT).contains("warning"))
                                .count();
                Map<String, Object> result = new LinkedHashMap<>();
                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("totalPatients", patientRepository.count());
                summary.put("consultationsCompleted", completed);
                summary.put("prescriptionsIssued", prescriptions.size());
                summary.put("aiAdoptionRate", consultations.isEmpty() ? 0
                                : Math.round(aiAssisted * 1000.0 / consultations.size()) / 10.0);
                summary.put("avgConsultTimeMinutes", null);
                summary.put("allergyAlertsAvoided", allergyAlerts);
                result.put("summary", summary);
                result.put("timeframe", timeframe);
                result.put("kpis", List.of(
                                Map.of("key", "doctors", "label", "Registered Doctors", "value",
                                                doctorRepository.count(), "tone", "blue"),
                                Map.of("key", "patients", "label", "Active Patients", "value",
                                                patientRepository.findAll().stream()
                                                                .filter(p -> "Active".equalsIgnoreCase(p.getStatus()))
                                                                .count(),
                                                "tone", "green"),
                                Map.of("key", "hospitals", "label", "Partner Hospitals", "value",
                                                hospitalRepository.count(), "tone", "purple")));

                Map<String, Object> systemHealth = new LinkedHashMap<>();
                systemHealth.put("uptime", "Not measured");
                systemHealth.put("apiLatencyMs", null);
                systemHealth.put("aiInferenceSec", null);
                systemHealth.put("dbConnections", "Managed by datasource pool");
                systemHealth.put("storageUsedPercent", null);
                systemHealth.put("status", "Not measured");
                result.put("systemHealth", systemHealth);

                Map<YearMonth, long[]> monthly = new TreeMap<>();
                for (Consultation consultation : consultations) {
                        LocalDate date = parseRecordDate(consultation.getDate());
                        if (date == null)
                                continue;
                        long[] values = monthly.computeIfAbsent(YearMonth.from(date), ignored -> new long[3]);
                        values[0]++;
                        if (consultation.getAiStateJson() != null && !consultation.getAiStateJson().isBlank())
                                values[2]++;
                }
                for (Prescription prescription : prescriptions) {
                        LocalDate date = parseRecordDate(prescription.getDate());
                        if (date != null)
                                monthly.computeIfAbsent(YearMonth.from(date), ignored -> new long[3])[1]++;
                }
                result.put("monthlyTrends", monthly.entrySet().stream().map(entry -> Map.of(
                                "month", entry.getKey().format(DateTimeFormatter.ofPattern("MMM")),
                                "consultations", entry.getValue()[0],
                                "prescriptions", entry.getValue()[1],
                                "aiDrafts", entry.getValue()[2])).toList());

                Map<String, Long> conditions = new HashMap<>();
                prescriptions.stream().map(Prescription::getDiagnosis).filter(Objects::nonNull)
                                .filter(v -> !v.isBlank())
                                .forEach(diagnosis -> conditions.merge(diagnosis, 1L, Long::sum));
                long conditionCount = Math.max(1, conditions.values().stream().mapToLong(Long::longValue).sum());
                result.put("topConditions", conditions.entrySet().stream()
                                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                                .map(entry -> Map.of("label", entry.getKey(), "count", entry.getValue(),
                                                "percentage", Math.round(entry.getValue() * 100.0 / conditionCount)))
                                .toList());

                Map<String, Long> drugClasses = new HashMap<>();
                prescriptions.stream()
                                .flatMap(p -> p.getItems() == null ? java.util.stream.Stream.empty()
                                                : p.getItems().stream())
                                .map(PrescriptionItem::getName).filter(Objects::nonNull)
                                .forEach(name -> drugClasses.merge(classifyMedication(name), 1L, Long::sum));
                long drugCount = Math.max(1, drugClasses.values().stream().mapToLong(Long::longValue).sum());
                result.put("prescribedDrugClasses", drugClasses.entrySet().stream()
                                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                                .map(entry -> Map.of("category", entry.getKey(),
                                                "share", Math.round(entry.getValue() * 100.0 / drugCount)))
                                .toList());

                Map<String, Object> aiQualityMetrics = new LinkedHashMap<>();
                aiQualityMetrics.put("transcriptionAccuracy", null);
                aiQualityMetrics.put("ocrAccuracy", null);
                aiQualityMetrics.put("doctorDraftAcceptanceRate", null);
                aiQualityMetrics.put("avgProcessingSeconds", null);
                result.put("aiQualityMetrics", aiQualityMetrics);

                List<Appointment> periodAppointments = appointmentRepository.findAll().stream()
                                .filter(a -> isWithinPeriod(a.getDate(), startDate, endDate)).toList();
                result.put("hospitalDistribution", hospitalRepository.findAll().stream().map(hospital -> {
                        long consults = periodAppointments.stream()
                                        .filter(a -> Objects.equals(a.getHospital(), hospital.getName()))
                                        .count();
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("name", hospital.getName());
                        item.put("code", hospital.getCode());
                        item.put("consults", consults);
                        item.put("share", periodAppointments.isEmpty() ? 0
                                        : Math.round(consults * 100.0 / periodAppointments.size()));
                        item.put("status", hospital.getStatus() == null ? "Unknown" : hospital.getStatus());
                        return item;
                }).toList());
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
                LocalDate date = parseRecordDate(value);
                return date != null && !date.isBefore(start) && !date.isAfter(end);
        }

        private LocalDate parseRecordDate(String value) {
                if (value == null || value.isBlank())
                        return null;
                try {
                        return LocalDate.parse(value.length() >= 10 ? value.substring(0, 10) : value);
                } catch (DateTimeParseException ex) {
                        return null;
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
                                "general", new HashMap<>(Map.of(
                                                "platformName", "MediCare AI Enterprise Health Platform",
                                                "maintenanceMode", false,
                                                "environment", "Configured by deployment", "dataRetentionYears", 7,
                                                "supportEmail", "")),
                                "aiEngine", new HashMap<>(Map.of(
                                                "primaryModel", "Configured by environment", "ocrEngine",
                                                "Provider not configured",
                                                "confidenceThresholdPercent", 92, "enforceAllergyCheck", true,
                                                "enforceInteractionCheck", true,
                                                "requireDoctorSignature", true)),
                                "security", new HashMap<>(Map.of(
                                                "maxFailedLogins", maxFailedLogins, "lockoutDurationMinutes",
                                                lockoutDurationMinutes,
                                                "enforce2FA", false, "ipAllowlistEnabled", false)),
                                "integrations", new HashMap<>(Map.of(
                                                "hl7FhirEndpoint", "", "apiKeySecretMasked", "Not configured",
                                                "webhookStatus", "Not configured")),
                                "workflows", new HashMap<>(Map.of(
                                                "patientAppointmentBookingEnabled", true,
                                                "patientMessagingEnabled", true))));
        }

        public Map<String, Object> getSettings() {
                return userSettingsService.getOrCreate(0L, "platform", defaultSettings());
        }

        public Map<String, Object> updateSettings(Map<String, Object> updated) {
                return userSettingsService.replace(0L, "platform", updated,
                                defaultSettings());
        }

        public Map<String, Object> getWorkflowSettings() {
                Object configuredWorkflows = getSettings().get("workflows");
                if (configuredWorkflows instanceof Map<?, ?> workflows) {
                        return Map.of(
                                        "patientAppointmentBookingEnabled",
                                        !Boolean.FALSE.equals(workflows.get("patientAppointmentBookingEnabled")),
                                        "patientMessagingEnabled",
                                        !Boolean.FALSE.equals(workflows.get("patientMessagingEnabled")));
                }
                return Map.of("patientAppointmentBookingEnabled", true, "patientMessagingEnabled", true);
        }

        public List<SystemLog> getSystemLogs(String level, String component, String query) {
                String normalizedLevel = level == null ? "All" : level.trim();
                String normalizedComponent = component == null ? "All" : component.trim();
                String normalizedQuery = normalize(query);
                return systemLogRepository.findAllByOrderByTimestampDesc().stream()
                                .filter(log -> "All".equalsIgnoreCase(normalizedLevel)
                                                || normalizedLevel.equalsIgnoreCase(log.getLevel()))
                                .filter(log -> "All".equalsIgnoreCase(normalizedComponent)
                                                || normalizedComponent.equalsIgnoreCase(log.getComponent()))
                                .filter(log -> normalizedQuery.isEmpty()
                                                || containsIgnoreCase(String.valueOf(log.getId()), normalizedQuery)
                                                || containsIgnoreCase(log.getUserEmail(), normalizedQuery)
                                                || containsIgnoreCase(log.getIpAddress(), normalizedQuery)
                                                || containsIgnoreCase(log.getMessage(), normalizedQuery))
                                .toList();
        }

        @Transactional
        public ApiResponse clearLogs() {
                long count = systemLogRepository.count();
                systemLogRepository.deleteAll();
                systemLogRepository.save(new SystemLog(
                                "WARN", "AUDIT", currentUserService.getUser().getEmail(),
                                "All previous " + count + " audit logs were purged by Administrator.", "Not recorded",
                                java.time.LocalDateTime.now().toString()));
                return new ApiResponse(true, "System audit logs cleared and purge event recorded");
        }

        private String normalize(String value) {
                return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        }

        private int doctorStatusRank(String status) {
                if ("Pending".equalsIgnoreCase(status) || "Pending Approval".equalsIgnoreCase(status))
                        return 0;
                if ("Active".equalsIgnoreCase(status))
                        return 1;
                if ("Suspended".equalsIgnoreCase(status))
                        return 2;
                return 3;
        }

        private boolean containsIgnoreCase(String value, String query) {
                return value != null && query != null
                                && value.toLowerCase(Locale.ROOT).contains(query.trim().toLowerCase(Locale.ROOT));
        }
}