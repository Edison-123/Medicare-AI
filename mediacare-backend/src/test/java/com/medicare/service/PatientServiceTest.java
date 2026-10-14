package com.medicare.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.entity.Appointment;
import com.medicare.entity.Consultation;
import com.medicare.entity.Doctor;
import com.medicare.entity.Patient;
import com.medicare.dto.BookAppointmentRequest;
import com.medicare.exception.ForbiddenException;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.LabTestRepository;
import com.medicare.repository.MedicineReminderRepository;
import com.medicare.repository.NotificationRepository;
import com.medicare.repository.PatientDocumentRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.RefillRequestRepository;
import com.medicare.repository.UserRepository;
import com.medicare.repository.VitalLogRepository;
import com.medicare.security.CurrentUserService;
import com.medicare.service.ClinicalMessageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private RefillRequestRepository refillRequestRepository;
    @Mock
    private VitalLogRepository vitalLogRepository;
    @Mock
    private ConsultationRepository consultationRepository;
    @Mock
    private MedicineReminderRepository reminderRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PatientDocumentRepository patientDocumentRepository;
    @Mock
    private LabTestRepository labTestRepository;
    @Mock
    private ClinicalMessageService clinicalMessageService;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private UserSettingsService userSettingsService;

    @InjectMocks
    private PatientService patientService;

    @Test
    void includesUnlinkedUpcomingConsultationsWithoutDuplicatingAppointments() {
        Patient patient = new Patient();
        patient.setId(11L);
        patient.setName("Test Patient");
        when(currentUserService.getCurrentPatient()).thenReturn(patient);

        LocalDate tomorrow = LocalDate.now().plusDays(1);
        Appointment existing = new Appointment();
        existing.setId(8L);
        existing.setPatientId(11L);
        existing.setDoctorId(4L);
        existing.setDate(tomorrow.toString());
        existing.setTime("09:00 AM");
        when(appointmentRepository.findByPatientId(11L)).thenReturn(List.of(existing));

        Consultation linked = consultation(20L, 8L, 4L, tomorrow, "09:00 AM");
        Consultation duplicateBySlot = consultation(21L, null, 4L, tomorrow, "09:00 AM");
        Consultation unlinked = consultation(22L, null, 4L, tomorrow, "10:00 AM");
        when(consultationRepository.findByPatientId(11L)).thenReturn(List.of(linked, duplicateBySlot, unlinked));

        Doctor doctor = new Doctor("Dr. Test", "General", null, "Test Hospital", null, null, null, "Active");
        when(doctorRepository.findById(4L)).thenReturn(Optional.of(doctor));

        List<Appointment> appointments = patientService.getAppointments();

        assertEquals(2, appointments.size());
        assertEquals(8L, appointments.get(0).getId());
        assertEquals(-22L, appointments.get(1).getId());
        assertEquals("consultation", appointments.get(1).getSource());
    }

    @Test
    void inactivePatientCannotBookAppointment() {
        Patient patient = new Patient();
        patient.setId(11L);
        patient.setStatus("Inactive");
        when(currentUserService.getCurrentPatient()).thenReturn(patient);

        assertThrows(ForbiddenException.class,
                () -> patientService.bookAppointment(new BookAppointmentRequest()));
    }

    @Test
    void rejectsPastAppointmentTimeWithHelpfulMessage() {
        Patient patient = new Patient();
        patient.setId(11L);
        patient.setStatus("Active");
        when(currentUserService.getCurrentPatient()).thenReturn(patient);

        java.time.LocalDateTime past = java.time.LocalDateTime.now().minusMinutes(10);
        BookAppointmentRequest request = new BookAppointmentRequest();
        request.setDoctorId(4L);
        request.setDate(past.toLocalDate().toString());
        request.setTime(past.format(java.time.format.DateTimeFormatter.ofPattern("hh:mm a", java.util.Locale.US)));

        com.medicare.exception.ValidationException exception = assertThrows(
                com.medicare.exception.ValidationException.class,
                () -> patientService.bookAppointment(request));

        org.junit.jupiter.api.Assertions.assertTrue(exception.getMessage().contains("already passed"));
        org.junit.jupiter.api.Assertions.assertTrue(exception.getMessage().contains("future slot"));
    }

    private Consultation consultation(Long id, Long appointmentId, Long doctorId, LocalDate date, String time) {
        Consultation consultation = new Consultation();
        consultation.setId(id);
        consultation.setAppointmentId(appointmentId);
        consultation.setDoctorId(doctorId);
        consultation.setDate(date.toString());
        consultation.setTime(time);
        consultation.setStatus("In Progress");
        return consultation;
    }
}