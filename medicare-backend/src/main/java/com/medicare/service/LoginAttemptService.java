package com.medicare.service;

import com.medicare.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class LoginAttemptService {

    private final int maxFailedLogins;
    private final Duration lockoutDuration;
    private final Map<String, AttemptWindow> windows = new HashMap<>();

    public LoginAttemptService(
            @Value("${medicare.auth.max-failed-logins:5}") int maxFailedLogins,
            @Value("${medicare.auth.lockout-duration-minutes:15}") long lockoutDurationMinutes) {
        this.maxFailedLogins = Math.max(1, maxFailedLogins);
        this.lockoutDuration = Duration.ofMinutes(Math.max(1, lockoutDurationMinutes));
    }

    public synchronized void assertAllowed(String email) {
        Instant now = Instant.now();
        pruneExpired(now);
        AttemptWindow window = windows.get(normalize(email));
        if (window != null && window.lockedUntil != null && now.isBefore(window.lockedUntil)) {
            throw new TooManyRequestsException("Too many unsuccessful sign-in attempts. Try again later.");
        }
    }

    public synchronized void recordFailure(String email) {
        Instant now = Instant.now();
        String key = normalize(email);
        AttemptWindow window = windows.get(key);
        if (window == null || !now.isBefore(window.startedAt.plus(lockoutDuration))) {
            window = new AttemptWindow(now);
            windows.put(key, window);
        }
        window.failures++;
        if (window.failures >= maxFailedLogins) {
            window.lockedUntil = now.plus(lockoutDuration);
        }
    }

    public synchronized void recordSuccess(String email) {
        windows.remove(normalize(email));
    }

    private void pruneExpired(Instant now) {
        windows.entrySet().removeIf(entry -> {
            AttemptWindow window = entry.getValue();
            Instant expiresAt = window.lockedUntil == null
                    ? window.startedAt.plus(lockoutDuration)
                    : window.lockedUntil;
            return !now.isBefore(expiresAt);
        });
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static final class AttemptWindow {
        private final Instant startedAt;
        private int failures;
        private Instant lockedUntil;

        private AttemptWindow(Instant startedAt) {
            this.startedAt = startedAt;
        }
    }
}