package com.medicare.repository;

import com.medicare.entity.RefillRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RefillRequestRepository extends JpaRepository<RefillRequest, Long> {
    List<RefillRequest> findByStatus(String status);
    List<RefillRequest> findByPatientId(Long patientId);
}
