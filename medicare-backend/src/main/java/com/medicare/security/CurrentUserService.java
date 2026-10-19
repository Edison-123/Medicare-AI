package com.medicare.security;

import com.medicare.entity.Doctor;
import com.medicare.entity.Patient;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.ForbiddenException;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.UnauthorizedException;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.PatientRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public CurrentUserService(PatientRepository patientRepository,
                              DoctorRepository doctorRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    public User getUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof User user)) {
            throw new UnauthorizedException("Authentication required");
        }

        return user;
    }

    public Patient getCurrentPatient() {
        User user = getUser();

        if (user.getRole() != Role.ROLE_PATIENT) {
            throw new ForbiddenException("Only patient accounts can access patient resources");
        }

        return patientRepository.findByEmailIgnoreCase(user.getEmail())
                .orElseThrow(() -> new NotFoundException("Patient profile not found for authenticated user"));
    }

    public Doctor getCurrentDoctor() {
        User user = getUser();

        if (user.getRole() != Role.ROLE_DOCTOR) {
            throw new ForbiddenException("Only doctor accounts can access doctor resources");
        }

        return doctorRepository.findByEmailIgnoreCase(user.getEmail())
                .orElseThrow(() -> new NotFoundException("Doctor profile not found for authenticated user"));
    }

    public boolean isAdmin() {
        return getUser().getRole() == Role.ROLE_ADMIN;
    }
}
