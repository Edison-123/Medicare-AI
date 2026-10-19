package com.medicare.repository;

import com.medicare.entity.VitalLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VitalLogRepository extends JpaRepository<VitalLog, Long> {
    List<VitalLog> findByPatientIdOrderByMeasuredAtDesc(Long patientId);
    List<VitalLog> findByPatientIdAndIsCriticalTrue(Long patientId);
}
