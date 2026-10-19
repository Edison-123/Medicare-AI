package com.medicare.repository;

import com.medicare.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    List<Consultation> findByDoctorId(Long doctorId);

    Optional<Consultation> findByAppointmentId(Long appointmentId);

    List<Consultation> findByPatientId(Long patientId);

    List<Consultation> findByDate(String date);
}