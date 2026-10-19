package com.medicare.controller;

import com.medicare.dto.AuthRequest;
import com.medicare.dto.AuthResponse;
import com.medicare.dto.ChangePasswordRequest;
import com.medicare.dto.UpdateProfilePictureRequest;
import com.medicare.dto.UserDto;
import com.medicare.entity.User;
import com.medicare.security.CurrentUserService;
import com.medicare.service.AuthService;
import com.medicare.service.ProfilePictureService;
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
    private final ProfilePictureService profilePictureService;
    private final CurrentUserService currentUserService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${medicare.jwt.cookie-secure:true}")
    private boolean secureCookie;

    public AuthController(AuthService authService, ProfilePictureService profilePictureService,
            CurrentUserService currentUserService) {
        this.authService = authService;
        this.profilePictureService = profilePictureService;
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
                user.getRole().name(), user.getSub(), user.getProfilePicture()));
    }

    @PutMapping("/profile-picture")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update the authenticated user's profile photo")
    public ResponseEntity<UserDto> updateProfilePicture(@Valid @RequestBody UpdateProfilePictureRequest request) {
        return ResponseEntity.ok(profilePictureService.update(currentUserService.getUser(),
                request.getProfilePicture()));
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(currentUserService.getUser());
        clearSessionCookies(request, response);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Change the authenticated user's password")
    public ResponseEntity<UserDto> changePassword(@Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        AuthResponse authResponse = authService.changePassword(currentUserService.getUser(),
                request.getCurrentPassword(), request.getNewPassword());
        setSessionCookies(servletRequest, servletResponse, authResponse.getToken());
        return ResponseEntity.ok(authResponse.getUser());
    }

    private void setSessionCookies(HttpServletRequest request, HttpServletResponse response, String token) {
        String path = request.getContextPath().isBlank() ? "/" : request.getContextPath();
        ResponseCookie authCookie = ResponseCookie.from("MC_AUTH", token)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path(path)
                .build();
        byte[] csrfBytes = new byte[32];
        secureRandom.nextBytes(csrfBytes);
        ResponseCookie csrfCookie = ResponseCookie.from("XSRF-TOKEN", Base64.getUrlEncoder().withoutPadding()
                .encodeToString(csrfBytes))
                .httpOnly(false)
                .secure(secureCookie)
                .sameSite("Strict")
                .path("/")
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
