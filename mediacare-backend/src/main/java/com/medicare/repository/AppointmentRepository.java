package com.medicare.repository;

import com.medicare.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByDoctorId(Long doctorId);

    List<Appointment> findByPatientId(Long patientId);

    List<Appointment> findByStatus(String status);

    /*
     * Used to find the appointment that belongs to
     * a consultation.
     */
    Optional<Appointment> findFirstByDoctorIdAndPatientIdAndDateAndTimeOrderByIdDesc(
            Long doctorId,
            Long patientId,
            String date,
            String time
    );

    /*
     * Fallback for older appointments where doctorId
     * was not stored correctly.
     */
    List<Appointment> findByPatientIdAndDateAndTime(
            Long patientId,
            String date,
            String time
    );
}