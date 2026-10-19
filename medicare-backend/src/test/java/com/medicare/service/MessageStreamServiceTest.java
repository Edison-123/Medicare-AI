package com.medicare.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Iterator;
import java.util.List;
import java.io.IOException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class MessageStreamServiceTest {

    @Test
    void messageUpdateIsSentOnlyToItsParticipants() throws Exception {
        SseEmitter doctorEmitter = mock(SseEmitter.class);
        SseEmitter patientEmitter = mock(SseEmitter.class);
        SseEmitter unrelatedEmitter = mock(SseEmitter.class);
        Iterator<SseEmitter> emitters = List.of(doctorEmitter, patientEmitter, unrelatedEmitter).iterator();
        MessageStreamService service = new MessageStreamService(emitters::next);

        service.subscribe(10L, "doctor");
        service.subscribe(20L, "patient");
        service.subscribe(30L, "doctor");
        service.onMessageCreated(new MessageCreatedEvent(10L, 20L));

        verify(doctorEmitter).send(any(SseEmitter.SseEventBuilder.class));
        verify(patientEmitter).send(any(SseEmitter.SseEventBuilder.class));
        verify(unrelatedEmitter, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void roleWideNotificationUpdateReachesAllAdminsOnly() throws Exception {
        SseEmitter firstAdmin = mock(SseEmitter.class);
        SseEmitter secondAdmin = mock(SseEmitter.class);
        SseEmitter doctor = mock(SseEmitter.class);
        Iterator<SseEmitter> emitters = List.of(firstAdmin, secondAdmin, doctor).iterator();
        MessageStreamService service = new MessageStreamService(emitters::next);

        service.subscribe(1L, "admin");
        service.subscribe(2L, "admin");
        service.subscribe(3L, "doctor");
        service.onNotificationChanged(new NotificationChangedEvent("admin", null));

        verify(firstAdmin).send(any(SseEmitter.SseEventBuilder.class));
        verify(secondAdmin).send(any(SseEmitter.SseEventBuilder.class));
        verify(doctor, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void userNotificationUpdateStaysScopedToThatUser() throws Exception {
        SseEmitter owner = mock(SseEmitter.class);
        SseEmitter otherDoctor = mock(SseEmitter.class);
        Iterator<SseEmitter> emitters = List.of(owner, otherDoctor).iterator();
        MessageStreamService service = new MessageStreamService(emitters::next);

        service.subscribe(11L, "doctor");
        service.subscribe(12L, "doctor");
        service.onNotificationChanged(new NotificationChangedEvent("doctor", 11L));

        verify(owner).send(any(SseEmitter.SseEventBuilder.class));
        verify(otherDoctor, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void disconnectedClientIsRemovedWithoutCompletingTheAsyncRequestAgain() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        doThrow(new IOException("client disconnected")).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        MessageStreamService service = new MessageStreamService(() -> emitter);
        service.subscribe(10L, "doctor");

        service.onMessageCreated(new MessageCreatedEvent(10L, 20L));
        service.onMessageCreated(new MessageCreatedEvent(10L, 20L));

        verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(emitter, never()).complete();
        verify(emitter, never()).completeWithError(any(Throwable.class));
    }
}