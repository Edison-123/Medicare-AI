package com.medicare.service;

import com.medicare.dto.ApiResponse;
import com.medicare.entity.Notification;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.ForbiddenException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.NotificationRepository;
import com.medicare.security.CurrentUserService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    public NotificationService(NotificationRepository notificationRepository, CurrentUserService currentUserService) {
        this.notificationRepository = notificationRepository;
        this.currentUserService = currentUserService;
    }

    private void validateRoleAccess(String roleKind) {
        if (roleKind == null || (!roleKind.equalsIgnoreCase("patient") && !roleKind.equalsIgnoreCase("doctor") && !roleKind.equalsIgnoreCase("admin"))) {
            throw new ValidationException("Role must be 'patient', 'doctor', or 'admin'");
        }
        User user = currentUserService.getUser();
        if (user.getRole() == Role.ROLE_PATIENT && !roleKind.equalsIgnoreCase("patient")) {
            throw new ForbiddenException("Patients cannot view non-patient notifications");
        }
        if (user.getRole() == Role.ROLE_DOCTOR && !roleKind.equalsIgnoreCase("doctor")) {
            throw new ForbiddenException("Doctors cannot view non-doctor notifications");
        }
    }

    public List<Notification> getNotifications(String roleKind) {
        validateRoleAccess(roleKind);
        User user = currentUserService.getUser();
        if (user.getRole() == Role.ROLE_ADMIN) {
            return notificationRepository.findByRoleKindOrderByIdDesc(roleKind.toLowerCase());
        }
        return notificationRepository.findByRoleKindAndUserId(roleKind.toLowerCase(), user.getId());
    }

    public ApiResponse markAllAsRead(String roleKind) {
        validateRoleAccess(roleKind);
        User user = currentUserService.getUser();
        List<Notification> list;
        if (user.getRole() == Role.ROLE_ADMIN) {
            list = notificationRepository.findByRoleKind(roleKind.toLowerCase());
        } else {
            list = notificationRepository.findByRoleKindAndUserId(roleKind.toLowerCase(), user.getId());
        }
        list.forEach(n -> n.setUnread(false));
        notificationRepository.saveAll(list);
        return new ApiResponse(true, "All notifications marked as read");
    }
}
