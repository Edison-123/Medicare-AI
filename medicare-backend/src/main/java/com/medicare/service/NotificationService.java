package com.medicare.service;

import com.medicare.dto.ApiResponse;
import com.medicare.entity.Notification;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.ForbiddenException;
import com.medicare.exception.ValidationException;
import com.medicare.repository.NotificationRepository;
import com.medicare.security.CurrentUserService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationService(NotificationRepository notificationRepository, CurrentUserService currentUserService,
            ApplicationEventPublisher eventPublisher) {
        this.notificationRepository = notificationRepository;
        this.currentUserService = currentUserService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Notification createNotification(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        publishChanged(saved.getRoleKind(), saved.getUserId());
        return saved;
    }

    @Transactional
    public void markNotificationsRead(List<Notification> notifications) {
        if (notifications == null || notifications.isEmpty()) {
            return;
        }
        notifications.forEach(notification -> notification.setUnread(false));
        notificationRepository.saveAll(notifications);
        notifications.stream()
                .map(notification -> new NotificationRecipient(notification.getRoleKind(), notification.getUserId()))
                .distinct()
                .forEach(recipient -> publishChanged(recipient.roleKind(), recipient.userId()));
    }

    private void validateRoleAccess(String roleKind) {
        if (roleKind == null || (!roleKind.equalsIgnoreCase("patient") && !roleKind.equalsIgnoreCase("doctor")
                && !roleKind.equalsIgnoreCase("admin"))) {
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
        return notificationRepository.findByRoleKindAndUserIdOrderByIdDesc(roleKind.toLowerCase(), user.getId());
    }

    @Transactional
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
        if (!list.isEmpty()) {
            publishChanged(roleKind, user.getRole() == Role.ROLE_ADMIN ? null : user.getId());
        }
        return new ApiResponse(true, "All notifications marked as read");
    }

    @Transactional
    public ApiResponse clearNotifications(String roleKind) {
        validateRoleAccess(roleKind);
        User user = currentUserService.getUser();
        List<Notification> list;
        if (user.getRole() == Role.ROLE_ADMIN) {
            list = notificationRepository.findByRoleKind(roleKind.toLowerCase());
        } else {
            list = notificationRepository.findByRoleKindAndUserId(roleKind.toLowerCase(), user.getId());
        }
        List<Notification> readNotifications = list.stream()
                .filter(notification -> !Boolean.TRUE.equals(notification.getUnread()))
                .toList();
        notificationRepository.deleteAll(readNotifications);
        if (!readNotifications.isEmpty()) {
            publishChanged(roleKind, user.getRole() == Role.ROLE_ADMIN ? null : user.getId());
        }
        return new ApiResponse(true, "Read notifications cleared");
    }

    private void publishChanged(String roleKind, Long userId) {
        eventPublisher.publishEvent(new NotificationChangedEvent(roleKind.toLowerCase(), userId));
    }

    private record NotificationRecipient(String roleKind, Long userId) {
    }
}
