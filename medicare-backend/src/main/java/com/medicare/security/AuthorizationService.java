package com.medicare.security;

import com.medicare.entity.Consultation;
import com.medicare.entity.Doctor;
import com.medicare.entity.Patient;
import com.medicare.entity.Prescription;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.ForbiddenException;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class AuthorizationService {

    private final CurrentUserService currentUserService;

    public AuthorizationService(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    public void checkPrescriptionAccess(Prescription prescription) {
        User user = currentUserService.getUser();

        if (user.getRole() == Role.ROLE_ADMIN) {
            return;
        }

        if (user.getRole() == Role.ROLE_DOCTOR) {
            Doctor doctor = currentUserService.getCurrentDoctor();
            if (!Objects.equals(prescription.getDoctorId(), doctor.getId())) {
                throw new ForbiddenException("You do not have access to this prescription");
            }
            return;
        }

        if (user.getRole() == Role.ROLE_PATIENT) {
            Patient patient = currentUserService.getCurrentPatient();
            if (!Objects.equals(prescription.getPatientId(), patient.getId())) {
                throw new ForbiddenException("You do not have access to this prescription");
            }
            return;
        }

        throw new ForbiddenException("Access denied");
    }

    public void checkDoctorOwnsPrescription(Prescription prescription) {
        if (currentUserService.isAdmin()) {
            return;
        }

        Doctor doctor = currentUserService.getCurrentDoctor();
        checkDoctorIsActive(doctor);
        if (!Objects.equals(prescription.getDoctorId(), doctor.getId())) {
            throw new ForbiddenException("Prescription does not belong to the authenticated doctor");
        }
    }

    public void checkDoctorIsActive(Doctor doctor) {
        if (!"Active".equalsIgnoreCase(doctor.getStatus())) {
            throw new ForbiddenException("Doctor account is not active. Contact an administrator.");
        }
    }

    public void checkConsultationAccess(Consultation consultation) {
        User user = currentUserService.getUser();

        if (user.getRole() == Role.ROLE_ADMIN) {
            return;
        }

        if (user.getRole() == Role.ROLE_DOCTOR) {
            Doctor doctor = currentUserService.getCurrentDoctor();
            if (!Objects.equals(consultation.getDoctorId(), doctor.getId())) {
                throw new ForbiddenException("You do not have access to this consultation");
            }
            return;
        }

        if (user.getRole() == Role.ROLE_PATIENT) {
            Patient patient = currentUserService.getCurrentPatient();
            if (!Objects.equals(consultation.getPatientId(), patient.getId())) {
                throw new ForbiddenException("You do not have access to this consultation");
            }
            return;
        }

        throw new ForbiddenException("Access denied");
    }

    public void checkDoctorOwnsConsultation(Consultation consultation) {
        if (currentUserService.isAdmin()) {
            return;
        }

        Doctor doctor = currentUserService.getCurrentDoctor();
        if (!Objects.equals(consultation.getDoctorId(), doctor.getId())) {
            throw new ForbiddenException("Consultation does not belong to the authenticated doctor");
        }
    }
}
