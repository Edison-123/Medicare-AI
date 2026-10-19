package com.medicare.dto;

public class PatientRegistrationResponse {
    private Long userId;
    private Long patientId;
    private String name;
    private String email;
    private String role;
    private String status;
    private String message;

    public PatientRegistrationResponse() {}

    public PatientRegistrationResponse(Long userId, Long patientId, String name,
                                       String email, String role, String status,
                                       String message) {
        this.userId = userId;
        this.patientId = patientId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.status = status;
        this.message = message;
    }

    public Long getUserId() { return userId; }
    public Long getPatientId() { return patientId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public String getMessage() { return message; }
}
