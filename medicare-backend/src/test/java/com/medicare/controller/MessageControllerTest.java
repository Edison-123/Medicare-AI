package com.medicare.controller;

import com.medicare.entity.User;
import com.medicare.entity.Role;
import com.medicare.repository.*;
import com.medicare.security.CurrentUserService;
import com.medicare.service.AdminService;
import com.medicare.service.ClinicalMessageService;
import com.medicare.service.MessageStreamService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageControllerTest {

    @Mock
    private ClinicalMessageService clinicalMessageService;
    @Mock
    private AdminService adminService;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private MessageStreamService messageStreamService;
    @InjectMocks
    private MessageController controller;

    @Test
    void messageStreamUsesAuthenticatedUserId() {
        User user = new User();
        user.setId(41L);
        user.setRole(Role.ROLE_DOCTOR);
        SseEmitter emitter = new SseEmitter();
        when(currentUserService.getUser()).thenReturn(user);
        when(messageStreamService.subscribe(41L, "doctor")).thenReturn(emitter);

        assertSame(emitter, controller.subscribeToMessageUpdates());
        verify(messageStreamService).subscribe(41L, "doctor");
    }
}