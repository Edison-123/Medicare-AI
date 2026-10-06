package com.medicare.config;

import com.medicare.entity.*;
import com.medicare.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final HospitalRepository hospitalRepository;
    private final ConsultationRepository consultationRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final RefillRequestRepository refillRequestRepository;
    private final MedicineReminderRepository reminderRepository;
    private final NotificationRepository notificationRepository;
    private final SystemLogRepository systemLogRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientDocumentRepository patientDocumentRepository;
    private final LabTestRepository labTestRepository;
    private final ClinicalMessageRepository clinicalMessageRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    public DataInitializer(UserRepository userRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            HospitalRepository hospitalRepository,
            ConsultationRepository consultationRepository,
            PrescriptionRepository prescriptionRepository,
            RefillRequestRepository refillRequestRepository,
            MedicineReminderRepository reminderRepository,
            NotificationRepository notificationRepository,
            SystemLogRepository systemLogRepository,
            AppointmentRepository appointmentRepository,
            PatientDocumentRepository patientDocumentRepository,
            LabTestRepository labTestRepository,
            ClinicalMessageRepository clinicalMessageRepository,
            PasswordEncoder passwordEncoder,
            Environment environment) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.hospitalRepository = hospitalRepository;
        this.consultationRepository = consultationRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.refillRequestRepository = refillRequestRepository;
        this.reminderRepository = reminderRepository;
        this.notificationRepository = notificationRepository;
        this.systemLogRepository = systemLogRepository;
        this.appointmentRepository = appointmentRepository;
        this.patientDocumentRepository = patientDocumentRepository;
        this.labTestRepository = labTestRepository;
        this.clinicalMessageRepository = clinicalMessageRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            hospitalRepository.findAll().stream()
                    .filter(hospital -> "HOSP-01".equals(hospital.getCode()))
                    .findFirst()
                    .ifPresent(hospital -> {
                        if (hospital.getType() == null)
                            hospital.setType("Tertiary Care Hospital");
                        if (hospital.getAddress() == null)
                            hospital.setAddress("100 Medical Parkway, Metropolis");
                        if (hospital.getDirector() == null)
                            hospital.setDirector("Dr. John Smith");
                        if (hospital.getDepartmentsCount() == null)
                            hospital.setDepartmentsCount(6);
                        if (hospital.getDoctorsCount() == null)
                            hospital.setDoctorsCount(2);
                        if (hospital.getBedsTotal() == null)
                            hospital.setBedsTotal(500);
                        hospitalRepository.save(hospital);
                    });
            return;
        }

        // Seed password is read from the environment; never hard-code credentials.
        // Set SEED_USER_PASSWORD to a strong value before first run.
        String rawPass = environment.getRequiredProperty("SEED_USER_PASSWORD");
        if (rawPass.isBlank()) {
            throw new IllegalStateException("SEED_USER_PASSWORD must not be blank.");
        }
        // 1. Seed Users
        String encodedPass = passwordEncoder.encode(rawPass);

        User docUser = userRepository.save(new User("doctor@medicare.ai", encodedPass, "Dr. John Smith",
                "MD, Internal Medicine", Role.ROLE_DOCTOR));
        User patUser = userRepository
                .save(new User("patient@medicare.ai", encodedPass, "John Doe", "Patient #101", Role.ROLE_PATIENT));
        User admUser = userRepository.save(
                new User("admin@medicare.ai", encodedPass, "System Administrator", "Super Admin", Role.ROLE_ADMIN));

        // 2. Seed Doctor
        Doctor doc = new Doctor("Dr. John Smith", "Internal Medicine & Pulmonology", "LIC-NY-84920",
                "MediCare Central Hospital", "doctor@medicare.ai", "+1 555 0199", 4.9, "Active");
        doctorRepository.save(doc);

        Doctor doc2 = new Doctor("Dr. Emily Chen", "Dermatology", "LIC-NY-77210", "MediCare Central Hospital",
                "echen@medicare.ai", "+1 555 0188", 4.8, "Active");
        doctorRepository.save(doc2);

        // 3. Seed Patients
        Patient pat = new Patient();
        pat.setName("John Doe");
        pat.setEmail("patient@medicare.ai");
        pat.setPhone("+1 555 0101");
        pat.setDob("1984-05-14");
        pat.setAge(42);
        pat.setGender("Male");
        pat.setBloodGroup("O+");
        pat.setHeightCm(178);
        pat.setWeightKg(74);
        pat.setBmi(23.4);
        pat.setAddress("742 Evergreen Terrace, Springfield, IL 62704");
        pat.setHealthCardNumber("MC-PAT-884910");
        pat.setInsuranceProvider("BlueCross HealthShield PPO");
        pat.setInsurancePolicy("BCS-88492019-X");
        pat.setRiskCategory("Moderate (Stage 1 HTN)");
        pat.setStatus("Active");
        pat.setLastVisit("2026-09-28");
        pat.setNextAppt("2026-10-12");
        pat.setHospital("MediCare Central Hospital");
        pat.setPrimaryDoctor("Dr. John Smith");
        pat.setAllergies(new java.util.ArrayList<>(List.of("Penicillin")));
        pat.setConditions(new java.util.ArrayList<>(List.of("Hypertension")));
        pat.setMeds(new java.util.ArrayList<>(List.of("Amlodipine 5mg")));
        pat.setVaccinationsJson(
                "[{\"id\":\"vax-1\",\"name\":\"COVID-19 Bivalent Booster\",\"date\":\"2024-11-10\",\"provider\":\"MediCare Central Clinic\",\"batch\":\"PFZ-BOOST-849\"},{\"id\":\"vax-2\",\"name\":\"Influenza (Annual Quadrivalent)\",\"date\":\"2025-10-05\",\"provider\":\"Springfield Health Hub\",\"batch\":\"FLU-2025-Q4\"}]");
        pat.setSurgeriesJson(
                "[{\"id\":\"surg-1\",\"procedure\":\"Laparoscopic Appendectomy\",\"date\":\"2016-09-18\",\"hospital\":\"Springfield Memorial\",\"surgeon\":\"Dr. R. Taylor, MD\"}]");
        pat.setFamilyHistoryJson(
                "[{\"relation\":\"Father\",\"condition\":\"Coronary Artery Disease, Hypertension\",\"ageOnset\":54},{\"relation\":\"Mother\",\"condition\":\"Type 2 Diabetes Mellitus\",\"ageOnset\":62}]");
        patientRepository.save(pat);

        Patient pat2 = new Patient();
        pat2.setName("Sarah Wilson");
        pat2.setEmail("sarah.wilson@medicare.ai");
        pat2.setPhone("+1 555 0102");
        pat2.setDob("1991-03-22");
        pat2.setAge(35);
        pat2.setGender("Female");
        pat2.setBloodGroup("A+");
        pat2.setHeightCm(165);
        pat2.setWeightKg(62);
        pat2.setBmi(22.8);
        pat2.setAddress("128 Oak Street, Springfield, IL");
        pat2.setStatus("Active");
        pat2.setLastVisit("2026-10-01");
        pat2.setNextAppt("2026-10-15");
        pat2.setHospital("MediCare Central Hospital");
        pat2.setPrimaryDoctor("Dr. John Smith");
        pat2.setAllergies(new java.util.ArrayList<>());
        pat2.setConditions(new java.util.ArrayList<>(List.of("Asthma")));
        pat2.setMeds(new java.util.ArrayList<>(List.of("Salbutamol inhaler")));
        patientRepository.save(pat2);

        Patient pat3 = new Patient();
        pat3.setName("Michael Brown");
        pat3.setEmail("michael.b@medicare.ai");
        pat3.setPhone("+1 555 0103");
        pat3.setDob("1968-11-04");
        pat3.setAge(58);
        pat3.setGender("Male");
        pat3.setBloodGroup("B+");
        pat3.setHeightCm(172);
        pat3.setWeightKg(82);
        pat3.setBmi(27.7);
        pat3.setAddress("404 Maple Ave, Metropolis");
        pat3.setStatus("Follow-up");
        pat3.setLastVisit("2026-09-20");
        pat3.setHospital("MediCare Central Hospital");
        pat3.setPrimaryDoctor("Dr. John Smith");
        pat3.setAllergies(new java.util.ArrayList<>(List.of("Sulfa drugs")));
        pat3.setConditions(new java.util.ArrayList<>(List.of("Type 2 Diabetes")));
        pat3.setMeds(new java.util.ArrayList<>(List.of("Metformin 500mg")));
        patientRepository.save(pat3);

        // 4. Seed Hospitals
        Hospital h1 = new Hospital();
        h1.setName("MediCare Central Hospital");
        h1.setCode("HOSP-01");
        h1.setCity("Metropolis");
        h1.setType("Tertiary Care Hospital");
        h1.setAddress("100 Medical Parkway, Metropolis");
        h1.setDirector("Dr. John Smith");
        h1.setDepartmentsCount(6);
        h1.setDoctorsCount(2);
        h1.setBedsTotal(500);
        h1.setBedsOccupied(412);
        h1.setStatus("Active");
        h1.setApiStatus("Online (25ms)");
        h1.setComplianceCert("NABH / State Verified");
        hospitalRepository.save(h1);

        // 5. Seed Consultations
        Consultation c1 = new Consultation();
        c1.setDoctorId(doc.getId());
        c1.setDoctorName(doc.getName());
        c1.setPatientId(pat.getId());
        c1.setPatientName(pat.getName());
        c1.setDate("2026-09-28");
        c1.setTime("10:00 AM");
        c1.setType("In-person OPD");
        c1.setStatus("Completed");
        c1.setRoom("Room 304, Building A");
        c1.setChiefComplaint("Quarterly hypertension and medication check");
        c1.setKeyTakeaway(
                "Blood pressure is well-regulated under your current dose of Amlodipine 5mg. Cardiovascular and pulmonary checks were completely normal.");
        c1.setVitalsAtVisit("BP: 128/82 mmHg · Pulse: 74 bpm · Weight: 74.0 kg · SpO2: 98%");
        c1.setDoctorNotes("Patient reports high adherence. Fasting labs stable.");
        c1.setPatientInstructions(
                "Continue taking Amlodipine 5mg once daily every morning.,Log your morning resting blood pressure twice a week.,Maintain low-sodium meals.,Next routine follow-up scheduled for October 12, 2026.");
        consultationRepository.save(c1);

        // 6. Seed Prescriptions
        Prescription rx = new Prescription();
        rx.setCode("RX-1001");
        rx.setDoctorId(doc.getId());
        rx.setDoctor(doc.getName());
        rx.setPatientId(pat.getId());
        rx.setPatient(pat.getName());
        rx.setHospital(h1.getName());
        rx.setDate("2026-09-28");
        rx.setDiagnosis("Stage 1 Essential Hypertension (Primary)");
        rx.setNotes("Take strictly in morning with water. Monitor resting BP weekly.");
        rx.setFollowUp("2026-10-12");
        rx.setStatus("Finalized");
        rx.setRefillsLeft(2);
        rx.setQrVerification("VERIFIED-SIG-849204");

        PrescriptionItem item1 = new PrescriptionItem();
        item1.setName("Amlodipine Besylate");
        item1.setStrength("5 mg");
        item1.setDosage("1 tablet");
        item1.setFrequency("Once daily");
        item1.setDuration("30 days");
        item1.setRoute("Oral");
        item1.setFood("After food");
        item1.setInstructions("Take in morning with water");
        rx.addItem(item1);

        prescriptionRepository.save(rx);

        // 7. Seed Pending Refill Request
        RefillRequest req = new RefillRequest();
        req.setPrescriptionId(rx.getId());
        req.setPrescriptionCode(rx.getCode());
        req.setPatientId(pat.getId());
        req.setPatientName(pat.getName());
        req.setMedicine("Amlodipine Besylate 5mg");
        req.setDosage("1 tablet daily");
        req.setLastVitals("BP 128/82 on Sep 28");
        req.setRequestedDate("2026-10-02");
        req.setStatus("Pending");
        req.setNotes("Supply running low; requesting 30-day renewal.");
        refillRequestRepository.save(req);

        // 8. Seed Medicine Reminders
        MedicineReminder rem1 = new MedicineReminder();
        rem1.setPatientId(pat.getId());
        rem1.setMedicineName("Amlodipine Besylate");
        rem1.setStrength("5 mg");
        rem1.setDosage("1 tablet");
        rem1.setSlot("Morning");
        rem1.setTime("08:00 AM");
        rem1.setFood("After breakfast");
        rem1.setInstructions("Take with a full glass of water");
        rem1.setTaken(true);
        rem1.setTakenAt("08:14 AM");
        rem1.setStreakDays(18);
        rem1.setTotalPills(30);
        rem1.setRemainingPills(12);
        reminderRepository.save(rem1);

        // 9. Seed Appointments
        Appointment appt1 = new Appointment();
        appt1.setPatientId(pat.getId());
        appt1.setDoctorId(doc.getId());
        appt1.setDoctor("Dr. John Smith");
        appt1.setSpecialty("Internal Medicine & Pulmonology");
        appt1.setHospital("MediCare Central Hospital");
        appt1.setDate("2026-10-12");
        appt1.setTime("10:30 AM");
        appt1.setType("In-person OPD");
        appt1.setRoom("Room 304, Building A");
        appt1.setStatus("Scheduled");
        appt1.setReason("Monthly blood pressure follow-up and prescription review");
        appt1.setDoctorAvatar("JS");
        appointmentRepository.save(appt1);

        Consultation scheduledConsultation = new Consultation();
        scheduledConsultation.setAppointmentId(appt1.getId());
        scheduledConsultation.setDoctorId(doc.getId());
        scheduledConsultation.setDoctorName(doc.getName());
        scheduledConsultation.setPatientId(pat.getId());
        scheduledConsultation.setPatientName(pat.getName());
        scheduledConsultation.setDate(appt1.getDate());
        scheduledConsultation.setTime(appt1.getTime());
        scheduledConsultation.setType(appt1.getType());
        scheduledConsultation.setStatus("Scheduled");
        scheduledConsultation.setRoom(appt1.getRoom());
        scheduledConsultation.setChiefComplaint(appt1.getReason());
        consultationRepository.save(scheduledConsultation);

        PatientDocument docRecord = new PatientDocument();
        docRecord.setPatientId(pat.getId());
        docRecord.setName("Annual_Comprehensive_Lab_Panel_2025.pdf");
        docRecord.setCategory("Laboratory");
        docRecord.setDate("2025-12-18");
        docRecord.setSize("1.8 MB");
        docRecord.setProvider("MediCare Central Labs");
        patientDocumentRepository.save(docRecord);

        LabTest seededLab = new LabTest();
        seededLab.setPatientId(pat.getId());
        seededLab.setTestName("Comprehensive Metabolic & Lipid Panel");
        seededLab.setCategory("Biochemistry");
        seededLab.setDate("2026-09-10");
        seededLab.setOrderingDoctor(doc.getName());
        seededLab.setFacility("MediCare Central Laboratory");
        seededLab.setStatus("Normal");
        seededLab.setAnalytesJson(
                "[{\"name\":\"Total Cholesterol\",\"value\":182,\"unit\":\"mg/dL\",\"min\":125,\"max\":200,\"status\":\"Normal\"},{\"name\":\"HDL Cholesterol\",\"value\":48,\"unit\":\"mg/dL\",\"min\":40,\"max\":80,\"status\":\"Normal\"},{\"name\":\"Serum Creatinine\",\"value\":0.94,\"unit\":\"mg/dL\",\"min\":0.70,\"max\":1.30,\"status\":\"Normal\"}]");
        seededLab.setDoctorComment("Excellent glycemic and renal stability.");
        labTestRepository.save(seededLab);

        ClinicalMessage seedPatientMsg = new ClinicalMessage();
        seedPatientMsg.setPatientId(pat.getId());
        seedPatientMsg.setDoctorId(doc.getId());
        seedPatientMsg.setSenderUserId(patUser.getId());
        seedPatientMsg.setSenderRole(Role.ROLE_PATIENT.name());
        seedPatientMsg.setText("Thank you doctor. I will continue monitoring my blood pressure.");
        seedPatientMsg.setCreatedAt("2026-10-05 18:15");
        seedPatientMsg.setReadByDoctor(false);
        seedPatientMsg.setReadByPatient(true);
        clinicalMessageRepository.save(seedPatientMsg);

        ClinicalMessage seedDoctorMsg = new ClinicalMessage();
        seedDoctorMsg.setPatientId(pat.getId());
        seedDoctorMsg.setDoctorId(doc.getId());
        seedDoctorMsg.setSenderUserId(docUser.getId());
        seedDoctorMsg.setSenderRole(Role.ROLE_DOCTOR.name());
        seedDoctorMsg
                .setText("Please continue your prescribed Amlodipine and bring your home BP log to the next visit.");
        seedDoctorMsg.setCreatedAt("2026-10-06 08:00");
        seedDoctorMsg.setReadByDoctor(true);
        seedDoctorMsg.setReadByPatient(false);
        clinicalMessageRepository.save(seedDoctorMsg);

        // 10. Seed Notifications
        notificationRepository.save(new Notification("doctor", docUser.getId(), "Prescription Refill Requested",
                "John Doe requested renewal for Amlodipine 5mg.", "/doctor/dashboard", "10 mins ago", true));
        notificationRepository.save(new Notification("patient", patUser.getId(), "Prescription Ready",
                "Dr. John Smith finalized your prescription RX-1001.", "/patient/prescriptions", "2 hours ago", true));
        notificationRepository.save(new Notification("admin", admUser.getId(), "Security Alert: IP Rate Limited",
                "5 failed login attempts blocked on IP 192.168.1.105.", "/admin/system-logs", "15 mins ago", true));

        // 11. Seed System Logs
        systemLogRepository.save(new SystemLog("INFO", "AUTH", "doctor@medicare.ai",
                "Doctor authenticated successfully via Web SSO", "192.168.1.42", "2026-10-02 09:14:22"));
        systemLogRepository.save(new SystemLog("INFO", "E-RX", "doctor@medicare.ai",
                "Prescription RX-1001 cryptographically sealed and signed", "192.168.1.42", "2026-10-02 10:22:15"));
    }
}
