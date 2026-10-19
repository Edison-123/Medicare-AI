package com.medicare.repository;

import com.medicare.entity.ClinicalMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClinicalMessageRepository extends JpaRepository<ClinicalMessage, Long> {
    List<ClinicalMessage> findByPatientIdAndDoctorIdOrderByIdAsc(Long patientId, Long doctorId);
    List<ClinicalMessage> findByDoctorIdOrderByIdAsc(Long doctorId);
    List<ClinicalMessage> findByPatientIdOrderByIdAsc(Long patientId);
    List<ClinicalMessage> findByDoctorIdAndReadByDoctorFalse(Long doctorId);
    List<ClinicalMessage> findByPatientIdAndReadByPatientFalse(Long patientId);
}
