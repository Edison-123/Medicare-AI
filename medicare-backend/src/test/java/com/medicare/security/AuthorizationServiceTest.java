package com.medicare.security;

import com.medicare.entity.Doctor;
import com.medicare.entity.Prescription;
import com.medicare.exception.ForbiddenException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthorizationServiceTest {

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private AuthorizationService authorizationService;

    @Test
    void rejectsPrescriptionWritesForSuspendedDoctor() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        doctor.setStatus("Suspended");
        Prescription prescription = new Prescription();
        prescription.setDoctorId(7L);
        when(currentUserService.isAdmin()).thenReturn(false);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);

        assertThrows(ForbiddenException.class,
                () -> authorizationService.checkDoctorOwnsPrescription(prescription));
    }

    @Test
    void rejectsPrescriptionWritesForPendingDoctor() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        doctor.setStatus("Pending");
        Prescription prescription = new Prescription();
        prescription.setDoctorId(7L);
        when(currentUserService.isAdmin()).thenReturn(false);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);

        assertThrows(ForbiddenException.class,
                () -> authorizationService.checkDoctorOwnsPrescription(prescription));
    }

    @Test
    void allowsPrescriptionWritesForActiveOwningDoctor() {
        Doctor doctor = new Doctor();
        doctor.setId(7L);
        doctor.setStatus("Active");
        Prescription prescription = new Prescription();
        prescription.setDoctorId(7L);
        when(currentUserService.isAdmin()).thenReturn(false);
        when(currentUserService.getCurrentDoctor()).thenReturn(doctor);

        assertDoesNotThrow(() -> authorizationService.checkDoctorOwnsPrescription(prescription));
    }
}