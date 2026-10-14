package com.medicare.service;

import com.medicare.entity.Doctor;
import com.medicare.entity.Patient;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.NotificationRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.RefillRequestRepository;
import com.medicare.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

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
    private ConsultationRepository consultationRepository;
    @Mock
    private UserSettingsService userSettingsService;
    @Mock
    private CurrentUserService currentUserService;

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

    private Patient patient(String status) {
        Patient patient = new Patient();
        patient.setStatus(status);
        return patient;
    }
}