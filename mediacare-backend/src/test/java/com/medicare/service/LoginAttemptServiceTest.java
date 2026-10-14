package com.medicare.service;

import com.medicare.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginAttemptServiceTest {

    @Test
    void temporarilyLocksAnAccountAfterConfiguredFailures() {
        LoginAttemptService service = new LoginAttemptService(2, 15);
        service.recordFailure(" Person@example.com ");
        assertDoesNotThrow(() -> service.assertAllowed("person@example.com"));

        service.recordFailure("person@example.com");

        assertThrows(TooManyRequestsException.class, () -> service.assertAllowed("person@example.com"));
    }

    @Test
    void successfulLoginClearsFailureWindow() {
        LoginAttemptService service = new LoginAttemptService(1, 15);
        service.recordFailure("person@example.com");
        service.recordSuccess("person@example.com");

        assertDoesNotThrow(() -> service.assertAllowed("person@example.com"));
    }
}