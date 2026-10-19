package com.medicare.controller;

import com.medicare.dto.ApiResponse;
import com.medicare.entity.Notification;
import com.medicare.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@Tag(name = "Notifications", description = "Endpoints for topbar notification center")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get notifications for role")
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestParam(value = "role", defaultValue = "patient") String role) {
        return ResponseEntity.ok(notificationService.getNotifications(role));
    }

    @PostMapping("/mark-read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark all notifications read for role")
    public ResponseEntity<ApiResponse> markAllRead(
            @RequestParam(value = "role", defaultValue = "patient") String role) {
        return ResponseEntity.ok(notificationService.markAllAsRead(role));
    }

    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Clear notifications for role")
    public ResponseEntity<ApiResponse> clearNotifications(
            @RequestParam(value = "role", defaultValue = "patient") String role) {
        return ResponseEntity.ok(notificationService.clearNotifications(role));
    }
}
