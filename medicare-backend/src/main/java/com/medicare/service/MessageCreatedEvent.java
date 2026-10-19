package com.medicare.service;

public record MessageCreatedEvent(Long doctorUserId, Long patientUserId) {
}