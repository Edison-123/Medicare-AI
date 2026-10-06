package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "system_logs")
public class SystemLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String level; // "INFO", "WARN", "ERROR", "CRITICAL"
    private String component; // "AUTH", "E-RX", "AI-TRANSCRIBE", "AUDIT"
    private String userEmail;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String ipAddress;
    private String timestamp;

    public SystemLog() {}

    public SystemLog(String level, String component, String userEmail, String message, String ipAddress, String timestamp) {
        this.level = level;
        this.component = component;
        this.userEmail = userEmail;
        this.message = message;
        this.ipAddress = ipAddress;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getComponent() { return component; }
    public void setComponent(String component) { this.component = component; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
