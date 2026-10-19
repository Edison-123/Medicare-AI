package com.medicare.service;

import com.medicare.entity.Notification;
import com.medicare.repository.NotificationRepository;
import com.medicare.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void createPublishesUserScopedNotificationUpdate() {
        Notification notification = notification("doctor", 22L);
        when(notificationRepository.save(notification)).thenReturn(notification);

        notificationService.createNotification(notification);

        verify(eventPublisher).publishEvent(argThat((Object event) -> event instanceof NotificationChangedEvent changed
                && "doctor".equals(changed.roleKind()) && Long.valueOf(22L).equals(changed.userId())));
    }

    @Test
    void createPublishesRoleWideNotificationUpdateWhenRecipientIsGlobal() {
        Notification notification = notification("admin", null);
        when(notificationRepository.save(notification)).thenReturn(notification);

        notificationService.createNotification(notification);

        verify(eventPublisher).publishEvent(argThat((Object event) -> event instanceof NotificationChangedEvent changed
                && "admin".equals(changed.roleKind()) && changed.userId() == null));
    }

    @Test
    void markingNotificationsReadPublishesChangeAndPersistsReadState() {
        Notification notification = notification("patient", 11L);

        notificationService.markNotificationsRead(List.of(notification));

        assertFalse(notification.getUnread());
        verify(notificationRepository).saveAll(List.of(notification));
        verify(eventPublisher).publishEvent(argThat((Object event) -> event instanceof NotificationChangedEvent changed
                && "patient".equals(changed.roleKind()) && Long.valueOf(11L).equals(changed.userId())));
    }

    private Notification notification(String roleKind, Long userId) {
        return new Notification(roleKind, userId, "Test", "Test notification", "/", "Now", true);
    }
}