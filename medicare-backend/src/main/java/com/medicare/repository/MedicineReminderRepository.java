package com.medicare.repository;

import com.medicare.entity.MedicineReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicineReminderRepository extends JpaRepository<MedicineReminder, Long> {
    List<MedicineReminder> findByPatientId(Long patientId);
}
