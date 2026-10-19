package com.medicare.service;

import com.medicare.dto.UserDto;
import com.medicare.entity.Patient;
import com.medicare.entity.Doctor;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.NotFoundException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.PatientRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Iterator;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Service
public class ProfilePictureService {

    private static final String JPEG_DATA_URL_PREFIX = "data:image/jpeg;base64,";
    private static final int MAX_IMAGE_BYTES = 1_000_000;
    private static final int MAX_IMAGE_DIMENSION = 1024;

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public ProfilePictureService(UserRepository userRepository, PatientRepository patientRepository,
            DoctorRepository doctorRepository) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional
    public UserDto update(User authenticatedUser, String profilePicture) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (profilePicture != null && !profilePicture.isBlank()) {
            validate(profilePicture);
        }
        user.setProfilePicture(profilePicture == null || profilePicture.isBlank() ? null : profilePicture);
        userRepository.save(user);
        if (user.getRole() == Role.ROLE_PATIENT) {
            patientRepository.findByEmailIgnoreCase(user.getEmail()).ifPresent(patient -> {
                patient.setProfilePicture(user.getProfilePicture());
                patientRepository.save(patient);
            });
        } else if (user.getRole() == Role.ROLE_DOCTOR) {
            doctorRepository.findByEmailIgnoreCase(user.getEmail()).ifPresent(doctor -> {
                doctor.setProfilePicture(user.getProfilePicture());
                doctorRepository.save(doctor);
            });
        }
        return new UserDto(user.getId(), user.getName(), user.getEmail(),
                user.getRole().name(), user.getSub(), user.getProfilePicture());
    }

    @Transactional
    public void populatePatientPictures(Collection<Patient> patients) {
        List<Patient> updated = new ArrayList<>();
        for (Patient patient : patients) {
            if (patient.getProfilePicture() != null || patient.getEmail() == null) {
                continue;
            }
            userRepository.findByEmailIgnoreCase(patient.getEmail())
                    .filter(user -> user.getRole() == Role.ROLE_PATIENT)
                    .map(User::getProfilePicture)
                    .filter(picture -> picture != null && !picture.isBlank())
                    .ifPresent(picture -> {
                        patient.setProfilePicture(picture);
                        updated.add(patient);
                    });
        }
        if (!updated.isEmpty()) {
            patientRepository.saveAll(updated);
        }
    }

    @Transactional
    public void populateDoctorPictures(Collection<Doctor> doctors) {
        List<Doctor> updated = new ArrayList<>();
        for (Doctor doctor : doctors) {
            if (doctor.getProfilePicture() != null || doctor.getEmail() == null) {
                continue;
            }
            userRepository.findByEmailIgnoreCase(doctor.getEmail())
                    .filter(user -> user.getRole() == Role.ROLE_DOCTOR)
                    .map(User::getProfilePicture)
                    .filter(picture -> picture != null && !picture.isBlank())
                    .ifPresent(picture -> {
                        doctor.setProfilePicture(picture);
                        updated.add(doctor);
                    });
        }
        if (!updated.isEmpty()) {
            doctorRepository.saveAll(updated);
        }
    }

    private void validate(String dataUrl) {
        if (!dataUrl.startsWith(JPEG_DATA_URL_PREFIX)) {
            throw new ValidationException("Profile photo must be a JPEG image");
        }

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(dataUrl.substring(JPEG_DATA_URL_PREFIX.length()));
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Profile photo is not valid image data");
        }
        if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
            throw new ValidationException("Profile photo must be smaller than 1 MB");
        }

        try (ImageInputStream imageInput = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (imageInput == null) {
                throw new ValidationException("Profile photo is not a valid JPEG image");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) {
                throw new ValidationException("Profile photo is not a valid JPEG image");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(imageInput, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (!"JPEG".equalsIgnoreCase(reader.getFormatName()) || width < 1 || height < 1
                        || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    throw new ValidationException("Profile photo dimensions must not exceed 1024 by 1024 pixels");
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new ValidationException("Profile photo is not a valid JPEG image");
        }
    }
}