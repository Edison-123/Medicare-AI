package com.medicare.controller;

import com.medicare.entity.Doctor;
import com.medicare.entity.Patient;
import com.medicare.entity.Prescription;
import com.medicare.entity.PrescriptionItem;
import com.medicare.entity.User;
import com.medicare.exception.ValidationException;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.PrescriptionRepository;
import com.medicare.repository.UserRepository;
import com.medicare.security.AuthorizationService;
import com.medicare.security.CurrentUserService;
import com.medicare.service.NotificationService;
import com.medicare.service.UserSettingsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrescriptionControllerTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private UserSettingsService userSettingsService;

    @InjectMocks
    private PrescriptionController controller;

    @Test
    void createUsesDoctorPrescriptionDefaultsWhenFieldsAreBlank() {
        Doctor doctor = doctor();
        User user = user(22L);
        Patient patient = patient();
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);
        when(currentUserService.getUser()).thenReturn(user);
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(userSettingsService.getSetting(22L, "doctor", "preferences", "defaultFollowUpDays")).thenReturn(21);
        when(userSettingsService.getSetting(22L, "doctor", "preferences", "defaultRxNotes"))
                .thenReturn("Call the clinic if symptoms worsen.");
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Prescription prescription = new Prescription();
        prescription.setPatientId(patient.getId());
        prescription.setItems(new ArrayList<>());

        Prescription created = controller.create(prescription).getBody();

        assertEquals("Call the clinic if symptoms worsen.", created.getNotes());
        assertEquals(LocalDate.now().plusDays(21).toString(), created.getFollowUp());
    }

    @Test
    void strictAllergySettingBlocksPrescriptionApproval() {
        Prescription prescription = prescriptionWithMedicine("Penicillin 500 mg");
        Patient patient = patient();
        patient.getAllergies().add("penicillin");
        when(prescriptionRepository.findById(3L)).thenReturn(Optional.of(prescription));
        when(userSettingsService.getSetting(22L, "doctor", "preferences", "strictAllergyChecks")).thenReturn(true);
        when(currentUserService.getUser()).thenReturn(user(22L));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThrows(ValidationException.class, () -> controller.transition(3L, "approve"));
    }

    @Test
    void disabledStrictAllergySettingAllowsApprovalAndStillSaves() {
        Prescription prescription = prescriptionWithMedicine("Penicillin 500 mg");
        Patient patient = patient();
        patient.getAllergies().add("penicillin");
        when(prescriptionRepository.findById(3L)).thenReturn(Optional.of(prescription));
        when(userSettingsService.getSetting(22L, "doctor", "preferences", "strictAllergyChecks")).thenReturn(false);
        when(currentUserService.getUser()).thenReturn(user(22L));
        when(prescriptionRepository.save(prescription)).thenReturn(prescription);

        Prescription approved = controller.transition(3L, "approve").getBody();

        assertEquals("Reviewed", approved.getStatus());
        verify(prescriptionRepository).save(prescription);
    }

    private Prescription prescriptionWithMedicine(String name) {
        Prescription prescription = new Prescription();
        prescription.setId(3L);
        prescription.setDoctorId(7L);
        prescription.setPatientId(11L);
        prescription.setDiagnosis("Test diagnosis");
        prescription.setStatus("Draft");
        PrescriptionItem item = new PrescriptionItem();
        item.setName(name);
        item.setDosage("One tablet");
        item.setFrequency("Once daily");
        item.setDuration("5 days");
        prescription.addItem(item);
        return prescription;
    }

    private Patient patient() {
        Patient patient = new Patient();
        patient.setId(11L);
        patient.setAllergies(new ArrayList<>());
        return patient;
    }

    private Doctor doctor() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        doctor.setName("Dr. Test");
        doctor.setStatus("Active");
        return doctor;
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}