package com.medicare.service;

public record NotificationChangedEvent(String roleKind, Long userId) {
}