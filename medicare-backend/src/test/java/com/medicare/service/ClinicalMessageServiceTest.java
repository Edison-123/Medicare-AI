package com.medicare.service;

import com.medicare.entity.Doctor;
import com.medicare.entity.Notification;
import com.medicare.entity.Patient;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.ClinicalMessageRepository;
import com.medicare.repository.ConsultationRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.NotificationRepository;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.UserRepository;
import com.medicare.security.CurrentUserService;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClinicalMessageServiceTest {

    @Mock
    private ClinicalMessageRepository messageRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private ConsultationRepository consultationRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserSettingsService userSettingsService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ClinicalMessageService clinicalMessageService;

    @Test
    void patientMessageNotifiesDoctorAndAdmin() {
        Patient patient = patient();
        Doctor doctor = doctor();
        User patientUser = user(101L, Role.ROLE_PATIENT);
        User doctorUser = user(202L, Role.ROLE_DOCTOR);
        when(currentUserService.getCurrentPatient()).thenReturn(patient);
        when(currentUserService.getUser()).thenReturn(patientUser);
        when(doctorRepository.findByNameIgnoreCase(doctor.getName())).thenReturn(Optional.of(doctor));
        when(userRepository.findByEmailIgnoreCase(doctor.getEmail())).thenReturn(Optional.of(doctorUser));
        when(userSettingsService.getSetting(doctorUser.getId(), "doctor", "notifications", "patientMessagePush"))
                .thenReturn(true);

        clinicalMessageService.sendFromPatient("Please call me");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationService, times(2)).createNotification(captor.capture());
        List<Notification> notifications = captor.getAllValues();
        Notification doctorNotification = notifications.stream()
                .filter(notification -> "doctor".equals(notification.getRoleKind()))
                .findFirst().orElseThrow();
        Notification adminNotification = notifications.stream()
                .filter(notification -> "admin".equals(notification.getRoleKind()))
                .findFirst().orElseThrow();

        assertEquals(doctorUser.getId(), doctorNotification.getUserId());
        assertEquals("/doctor/messages?patientId=11", doctorNotification.getLink());
        assertNull(adminNotification.getUserId());
        assertTrue(adminNotification.getMessage().contains("secure message"));
        assertTrue(
                notifications.stream().noneMatch(notification -> notification.getMessage().contains("Please call me")));
        verify(eventPublisher).publishEvent(argThat((Object event) -> event instanceof MessageCreatedEvent created
                && created.doctorUserId().equals(doctorUser.getId())
                && created.patientUserId().equals(patientUser.getId())));
    }

    @Test
    void disabledPatientMessagePushSuppressesOnlyDoctorNotification() {
        Patient patient = patient();
        Doctor doctor = doctor();
        User patientUser = user(101L, Role.ROLE_PATIENT);
        User doctorUser = user(202L, Role.ROLE_DOCTOR);
        when(currentUserService.getCurrentPatient()).thenReturn(patient);
        when(currentUserService.getUser()).thenReturn(patientUser);
        when(doctorRepository.findByNameIgnoreCase(doctor.getName())).thenReturn(Optional.of(doctor));
        when(userRepository.findByEmailIgnoreCase(doctor.getEmail())).thenReturn(Optional.of(doctorUser));
        when(userSettingsService.getSetting(doctorUser.getId(), "doctor", "notifications", "patientMessagePush"))
                .thenReturn(false);

        clinicalMessageService.sendFromPatient("Please call me");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationService).createNotification(captor.capture());
        assertEquals("admin", captor.getValue().getRoleKind());
        verify(messageRepository).save(any());
    }

    @Test
    void doctorMessageNotifiesPatientAndAdmin() {
        Patient patient = patient();
        Doctor doctor = doctor();
        User doctorUser = user(202L, Role.ROLE_DOCTOR);
        User patientUser = user(101L, Role.ROLE_PATIENT);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(currentUserService.getUser()).thenReturn(doctorUser);
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(userRepository.findByEmailIgnoreCase(patient.getEmail())).thenReturn(Optional.of(patientUser));

        clinicalMessageService.sendFromDoctor(patient.getId(), "Your results are ready");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationService, times(2)).createNotification(captor.capture());
        List<Notification> notifications = captor.getAllValues();
        Notification patientNotification = notifications.stream()
                .filter(notification -> "patient".equals(notification.getRoleKind()))
                .findFirst().orElseThrow();

        assertEquals(patientUser.getId(), patientNotification.getUserId());
        assertEquals("/patient/messages", patientNotification.getLink());
        assertTrue(notifications.stream().anyMatch(notification -> "admin".equals(notification.getRoleKind())));
        verify(eventPublisher).publishEvent(argThat((Object event) -> event instanceof MessageCreatedEvent created
                && created.doctorUserId().equals(doctorUser.getId())
                && created.patientUserId().equals(patientUser.getId())));
    }

    @Test
    void openingDoctorThreadMarksMessagesAndOnlyThatThreadNotificationRead() {
        Patient patient = patient();
        Doctor doctor = doctor();
        User doctorUser = user(202L, Role.ROLE_DOCTOR);
        com.medicare.entity.ClinicalMessage message = new com.medicare.entity.ClinicalMessage();
        message.setReadByDoctor(false);
        Notification matchingNotification = new Notification("doctor", 202L, "New message from your patient",
                "Test Patient sent you a secure message.", "/doctor/messages?patientId=11", "Now", true);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(currentUserService.getUser()).thenReturn(doctorUser);
        when(patientRepository.findById(11L)).thenReturn(Optional.of(patient));
        when(messageRepository.findByPatientIdAndDoctorIdOrderByIdAsc(11L, 7L)).thenReturn(List.of(message));
        when(notificationRepository.findByRoleKindAndUserIdAndLinkAndUnreadTrue(
                "doctor", 202L, "/doctor/messages?patientId=11")).thenReturn(List.of(matchingNotification));

        clinicalMessageService.markDoctorThreadRead(11L);

        assertTrue(message.getReadByDoctor());
        verify(messageRepository).saveAll(List.of(message));
        verify(notificationService).markNotificationsRead(List.of(matchingNotification));
    }

    @Test
    void openingPatientThreadMarksMessagesAndDoctorNotificationsRead() {
        Patient patient = patient();
        Doctor doctor = doctor();
        User patientUser = user(101L, Role.ROLE_PATIENT);
        com.medicare.entity.ClinicalMessage message = new com.medicare.entity.ClinicalMessage();
        message.setReadByPatient(false);
        Notification notification = new Notification("patient", 101L, "New message from your doctor",
                "Dr. Test sent you a secure message.", "/patient/messages", "Now", true);
        when(currentUserService.getCurrentPatient()).thenReturn(patient);
        when(currentUserService.getUser()).thenReturn(patientUser);
        when(doctorRepository.findByNameIgnoreCase("Dr. Test")).thenReturn(Optional.of(doctor));
        when(messageRepository.findByPatientIdAndDoctorIdOrderByIdAsc(11L, 7L)).thenReturn(List.of(message));
        when(notificationRepository.findByRoleKindAndUserIdAndTitleAndUnreadTrue(
                "patient", 101L, "New message from your doctor")).thenReturn(List.of(notification));

        clinicalMessageService.markPatientThreadRead();

        assertTrue(message.getReadByPatient());
        verify(messageRepository).saveAll(List.of(message));
        verify(notificationService).markNotificationsRead(List.of(notification));
    }

    private Patient patient() {
        Patient patient = new Patient();
        patient.setId(11L);
        patient.setName("Test Patient");
        patient.setEmail("patient@example.com");
        patient.setPrimaryDoctor("Dr. Test");
        return patient;
    }

    private Doctor doctor() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        doctor.setName("Dr. Test");
        doctor.setEmail("doctor@example.com");
        return doctor;
    }

    private User user(Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        return user;
    }
}