package com.medicare.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
public class MessageStreamService {

    private final Map<Long, Set<SseEmitter>> streams = new ConcurrentHashMap<>();
    private final Map<String, Set<SseEmitter>> roleStreams = new ConcurrentHashMap<>();
    private final Supplier<SseEmitter> emitterFactory;
    private final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "message-stream-heartbeat");
        thread.setDaemon(true);
        return thread;
    });

    @Autowired
    public MessageStreamService() {
        this(() -> new SseEmitter(0L));
    }

    MessageStreamService(Supplier<SseEmitter> emitterFactory) {
        this.emitterFactory = emitterFactory;
    }

    public SseEmitter subscribe(Long userId, String roleKind) {
        SseEmitter emitter = emitterFactory.get();
        streams.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
        String normalizedRole = roleKind.toLowerCase();
        roleStreams.computeIfAbsent(normalizedRole, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
        Runnable remove = () -> remove(userId, normalizedRole, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(() -> {
            remove.run();
            emitter.complete();
        });
        emitter.onError(ignored -> remove.run());
        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(MessageCreatedEvent event) {
        sendUpdate(event.doctorUserId());
        if (!event.doctorUserId().equals(event.patientUserId())) {
            sendUpdate(event.patientUserId());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationChanged(NotificationChangedEvent event) {
        if (event.userId() != null) {
            sendNotificationUpdate(streams.get(event.userId()));
        } else {
            sendNotificationUpdate(roleStreams.get(event.roleKind().toLowerCase()));
        }
    }

    @PostConstruct
    void startHeartbeats() {
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeats, 15, 15, TimeUnit.SECONDS);
    }

    @PreDestroy
    void stopHeartbeats() {
        heartbeatExecutor.shutdownNow();
    }

    private void sendHeartbeats() {
        streams.forEach((userId, emitters) -> emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().comment("keep-alive"));
            } catch (IOException | IllegalStateException exception) {
                finishDisconnected(userId, emitter);
            }
        }));
    }

    private void sendUpdate(Long userId) {
        Set<SseEmitter> emitters = streams.get(userId);
        if (emitters == null) {
            return;
        }
        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().name("message-updated").data(Map.of("updated", true)));
            } catch (IOException | IllegalStateException exception) {
                finishDisconnected(userId, emitter);
            }
        });
    }

    // private void sendNotificationUpdate(Set<SseEmitter> emitters) {
    // if (emitters == null) {
    // return;
    // }
    // emitters.forEach(emitter -> {
    // try {
    // emitter.send(SseEmitter.event().name("notification-updated").data(Map.of("updated",
    // true)));
    // } catch (IOException | IllegalStateException exception) {
    // emitter.completeWithError(exception);
    // }
    // });
    // }

    private void sendNotificationUpdate(Set<SseEmitter> emitters) {
        if (emitters == null) {
            return;
        }

        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification-updated")
                        .data(Map.of("updated", true)));
            } catch (IOException | IllegalStateException exception) {
                finishDisconnected(emitter);
            }
        });
    }

    private void finishDisconnected(Long userId, SseEmitter emitter) {
        remove(userId, emitter);
    }

    private void finishDisconnected(SseEmitter emitter) {
        remove(emitter);
    }

    private void remove(SseEmitter emitter) {
        streams.forEach((userId, emitters) -> {
            if (emitters.contains(emitter)) {
                remove(userId, emitter);
            }
        });
    }

    private void remove(Long userId, String roleKind, SseEmitter emitter) {
        streams.computeIfPresent(userId, (ignored, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
        removeFromRoleStreams(roleKind, emitter);
    }

    private void remove(Long userId, SseEmitter emitter) {
        streams.computeIfPresent(userId, (ignored, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
        roleStreams.forEach((roleKind, emitters) -> removeFromRoleStreams(roleKind, emitter));
    }

    private void removeFromRoleStreams(String roleKind, SseEmitter emitter) {
        roleStreams.computeIfPresent(roleKind, (ignored, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
    }
}