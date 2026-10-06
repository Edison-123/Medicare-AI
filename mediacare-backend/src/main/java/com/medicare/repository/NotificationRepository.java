package com.medicare.repository;

import com.medicare.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRoleKindOrderByIdDesc(String roleKind);
    List<Notification> findByRoleKind(String roleKind);
    List<Notification> findByUserIdOrderByIdDesc(Long userId);
    List<Notification> findByRoleKindAndUserId(String roleKind, Long userId);
}
