package com.medicare.config;

import com.medicare.entity.Role;
import com.medicare.entity.User;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    @Test
    void rejectsUnsecuredTokenByDefault() {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey",
                Base64.getEncoder().encodeToString(Keys.hmacShaKeyFor(new byte[32]).getEncoded()));

        String unsecuredToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjo3Nzc3Nzc3Nzc3fQ.";

        assertFalse(service.isTokenValid(unsecuredToken, "test@example.com"));
    }

    @Test
    void allowsUnsecuredTokensWhenExplicitlyEnabled() {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey",
                Base64.getEncoder().encodeToString(Keys.hmacShaKeyFor(new byte[32]).getEncoded()));
        ReflectionTestUtils.setField(service, "allowUnsecuredTokens", true);

        String unsecuredToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjo3Nzc3Nzc3Nzc3fQ.";

        assertTrue(service.isTokenValid(unsecuredToken, "test@example.com"));
    }

    @Test
    void generatesNonExpiringTokensForEveryRole() {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey", "medicare-dev-secret-key-1234567890");

        for (Role role : Role.values()) {
            User user = new User("test@example.com", "pw", "Test User", "sub-1", role);
            user.setId(42L);
            String token = service.generateToken(user);

            assertTrue(service.isTokenValid(token, "test@example.com"));
            assertNull(service.extractClaim(token, claims -> claims.getExpiration()));
        }
    }

    @Test
    void rejectsTokensFromBeforeLogoutVersionChange() {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey",
                Base64.getEncoder().encodeToString(Keys.hmacShaKeyFor(new byte[32]).getEncoded()));

        User user = new User("test@example.com", "pw", "Test User", "sub-1", Role.ROLE_DOCTOR);
        user.setId(42L);
        user.setTokenVersion(4);
        String token = service.generateToken(user);

        assertTrue(service.isTokenValid(token, "test@example.com", 4));
        assertFalse(service.isTokenValid(token, "test@example.com", 5));
    }
}
