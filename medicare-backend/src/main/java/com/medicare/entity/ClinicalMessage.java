package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "clinical_messages")
public class ClinicalMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false)
    private Long senderUserId;

    @Column(nullable = false, length = 30)
    private String senderRole;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private String createdAt;

    @Column(nullable = false)
    private Boolean readByDoctor = true;

    @Column(nullable = false)
    private Boolean readByPatient = true;

    public ClinicalMessage() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public Long getSenderUserId() { return senderUserId; }
    public void setSenderUserId(Long senderUserId) { this.senderUserId = senderUserId; }
    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public Boolean getReadByDoctor() { return readByDoctor; }
    public void setReadByDoctor(Boolean readByDoctor) { this.readByDoctor = readByDoctor; }
    public Boolean getReadByPatient() { return readByPatient; }
    public void setReadByPatient(Boolean readByPatient) { this.readByPatient = readByPatient; }
}
