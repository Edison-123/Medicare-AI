package com.medicare.controller;

import com.medicare.dto.AuthRequest;
import com.medicare.dto.AuthResponse;
import com.medicare.dto.UserDto;
import com.medicare.entity.User;
import com.medicare.security.CurrentUserService;
import com.medicare.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "User authentication and JWT token generation")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${medicare.jwt.expiration-ms:900000}")
    private long jwtExpirationMs;

    @Value("${medicare.jwt.cookie-secure:true}")
    private boolean secureCookie;

    public AuthController(AuthService authService, CurrentUserService currentUserService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email & password")
    public ResponseEntity<UserDto> login(@Valid @RequestBody AuthRequest request,
            HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        AuthResponse authResponse = authService.login(request);
        setSessionCookies(servletRequest, servletResponse, authResponse.getToken());
        return ResponseEntity.ok(authResponse.getUser());
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> currentUser() {
        User user = currentUserService.getUser();
        return ResponseEntity.ok(new UserDto(user.getId(), user.getName(), user.getEmail(),
                user.getRole().name(), user.getSub()));
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(currentUserService.getUser());
        clearSessionCookies(request, response);
        return ResponseEntity.noContent().build();
    }

    private void setSessionCookies(HttpServletRequest request, HttpServletResponse response, String token) {
        String path = request.getContextPath().isBlank() ? "/" : request.getContextPath();
        Duration lifetime = Duration.ofMillis(jwtExpirationMs);
        ResponseCookie authCookie = ResponseCookie.from("MC_AUTH", token)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path(path)
                .maxAge(lifetime)
                .build();
        byte[] csrfBytes = new byte[32];
        secureRandom.nextBytes(csrfBytes);
        ResponseCookie csrfCookie = ResponseCookie.from("XSRF-TOKEN", Base64.getUrlEncoder().withoutPadding()
                .encodeToString(csrfBytes))
                .httpOnly(false)
                .secure(secureCookie)
                .sameSite("Strict")
                .path("/")
                .maxAge(lifetime)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, authCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, csrfCookie.toString());
    }

    private void clearSessionCookies(HttpServletRequest request, HttpServletResponse response) {
        String path = request.getContextPath().isBlank() ? "/" : request.getContextPath();
        ResponseCookie authCookie = ResponseCookie.from("MC_AUTH", "")
                .httpOnly(true).secure(secureCookie).sameSite("Strict").path(path).maxAge(Duration.ZERO).build();
        ResponseCookie csrfCookie = ResponseCookie.from("XSRF-TOKEN", "")
                .httpOnly(false).secure(secureCookie).sameSite("Strict").path("/").maxAge(Duration.ZERO).build();
        response.addHeader(HttpHeaders.SET_COOKIE, authCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, csrfCookie.toString());
    }
}
