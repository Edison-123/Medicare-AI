package com.medicare.repository;

import com.medicare.entity.PatientDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PatientDocumentRepository extends JpaRepository<PatientDocument, Long> {
    List<PatientDocument> findByPatientIdOrderByIdDesc(Long patientId);
}
