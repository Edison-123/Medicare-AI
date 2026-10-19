package com.medicare.service;

import com.medicare.entity.Appointment;
import com.medicare.entity.Doctor;
import com.medicare.entity.Patient;
import com.medicare.entity.User;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.NotificationRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.RefillRequestRepository;
import com.medicare.repository.UserRepository;
import com.medicare.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DoctorServiceTest {

    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private RefillRequestRepository refillRequestRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AiAccuracyMetricsService aiAccuracyMetricsService;
    @Mock
    private ConsultationRepository consultationRepository;
    @Mock
    private UserSettingsService userSettingsService;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DoctorService doctorService;

    @Test
    void dashboardCountsActivePatientRecords() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(patientRepository.findAll()).thenReturn(List.of(
                patient("Active"), patient("Active"), patient("Follow-up")));
        when(prescriptionRepository.findByDoctorId(7L)).thenReturn(List.of());
        when(appointmentRepository.findByDoctorId(7L)).thenReturn(List.of());
        when(consultationRepository.findByDoctorId(7L)).thenReturn(List.of());

        Map<String, Object> dashboard = doctorService.getDashboard();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> stats = (List<Map<String, Object>>) dashboard.get("stats");

        Object activePatients = stats.stream()
                .filter(stat -> "Active Patients".equals(stat.get("label")))
                .findFirst()
                .orElseThrow()
                .get("value");
        assertEquals("2", activePatients);
    }

    @Test
    void dashboardIncludesOnlyAppointmentsDatedToday() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(patientRepository.findAll()).thenReturn(List.of());
        when(prescriptionRepository.findByDoctorId(7L)).thenReturn(List.of());
        when(appointmentRepository.findByDoctorId(7L)).thenReturn(List.of(
                appointment(1L, LocalDate.now().minusDays(1)),
                appointment(2L, LocalDate.now()),
                appointment(3L, LocalDate.now().plusDays(1))));
        when(consultationRepository.findByDoctorId(7L)).thenReturn(List.of());

        Map<String, Object> dashboard = doctorService.getDashboard();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> appointments = (List<Map<String, Object>>) dashboard.get("appointments");

        assertEquals(List.of(2L), appointments.stream().map(appointment -> appointment.get("id")).toList());
    }

    @Test
    void updateSettingsPersistsDoctorProfileFieldsWithoutChangingEmail() {
        Doctor doctor = new Doctor("Old Name", "Old specialty", "OLD-1", "Old Clinic", "doctor@example.test",
                "555-0100", 4.8, "Active");
        doctor.setId(7L);
        User user = new User();
        user.setId(12L);
        user.setName("Old Name");
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(currentUserService.getUser()).thenReturn(user);
        Map<String, Object> profile = Map.of(
                "fullName", "Updated Name",
                "specialization", "Cardiology",
                "licenseNumber", "LIC-22",
                "hospitalAffiliation", "Central Clinic",
                "phone", "555-0112",
                "email", "changed@example.test",
                "experienceYears", 12);
        Map<String, Object> settings = Map.of("profile", profile);

        doctorService.updateSettings(settings);

        assertEquals("Updated Name", doctor.getName());
        assertEquals("Updated Name", user.getName());
        assertEquals("Cardiology", doctor.getSpecialization());
        assertEquals("LIC-22", doctor.getLicenseNumber());
        assertEquals("Central Clinic", doctor.getHospital());
        assertEquals("555-0112", doctor.getPhone());
        assertEquals(12, doctor.getExperienceYears());
        assertEquals("doctor@example.test", doctor.getEmail());
        verify(userRepository).save(user);
        verify(doctorRepository).save(doctor);
        verify(userSettingsService).replace(eq(12L), eq("doctor"), eq(settings), anyMap());
    }

    @Test
    void reportsReturnOnlyAccuracyMetricsCalculatedForTheReportPeriod() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(consultationRepository.findByDoctorId(7L)).thenReturn(List.of());
        when(prescriptionRepository.findByDoctorId(7L)).thenReturn(List.of());
        when(aiAccuracyMetricsService.calculate(List.of())).thenReturn(Map.of(
                "transcriptionAccuracy", 98.5,
                "transcriptionSampleCount", 8,
                "ocrAccuracy", 96.0,
                "ocrSampleCount", 3,
                "doctorDraftAcceptanceRate", 75.0,
                "doctorDraftReviewSampleCount", 4,
                "avgProcessingSeconds", 2.5,
                "processingSampleCount", 6));

        Map<String, Object> report = doctorService.getReports("30d");
        @SuppressWarnings("unchecked")
        Map<String, Object> metrics = (Map<String, Object>) report.get("aiQualityMetrics");

        assertEquals(98.5, metrics.get("transcriptionAccuracy"));
        assertEquals(8, metrics.get("transcriptionSampleCount"));
        assertEquals(96.0, metrics.get("ocrAccuracy"));
        assertEquals(3, metrics.get("ocrSampleCount"));
        assertEquals(75.0, metrics.get("doctorDraftAcceptanceRate"));
        assertEquals(4, metrics.get("doctorDraftReviewSampleCount"));
        assertEquals(2.5, metrics.get("avgProcessingSeconds"));
        assertEquals(6, metrics.get("processingSampleCount"));
    }

    private Appointment appointment(Long id, LocalDate date) {
        Appointment appointment = new Appointment();
        appointment.setId(id);
        appointment.setDate(date.toString());
        appointment.setTime("09:00 AM");
        appointment.setPatient("Patient");
        appointment.setStatus("Scheduled");
        return appointment;
    }

    private Patient patient(String status) {
        Patient patient = new Patient();
        patient.setStatus(status);
        return patient;
    }
}