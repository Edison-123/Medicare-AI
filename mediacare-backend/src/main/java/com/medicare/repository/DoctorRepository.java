package com.medicare.repository;

import com.medicare.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findByStatus(String status);
    Optional<Doctor> findByEmailIgnoreCase(String email);
    Optional<Doctor> findByNameIgnoreCase(String name);
}
