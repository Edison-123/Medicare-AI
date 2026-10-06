package com.medicare.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions")
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code; // e.g. "RX-1001"

    private Long doctorId;
    private String doctor;
    private Long patientId;
    private String patient;
    private String hospital;
    private String date;
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String followUp;
    private String status; // "Draft", "Reviewed", "Finalized", "Cancelled"
    private Integer refillsLeft;
    private String qrVerification;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<PrescriptionItem> items = new ArrayList<>();

    public Prescription() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

    public String getDoctor() { return doctor; }
    public void setDoctor(String doctor) { this.doctor = doctor; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatient() { return patient; }
    public void setPatient(String patient) { this.patient = patient; }

    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getFollowUp() { return followUp; }
    public void setFollowUp(String followUp) { this.followUp = followUp; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRefillsLeft() { return refillsLeft; }
    public void setRefillsLeft(Integer refillsLeft) { this.refillsLeft = refillsLeft; }

    public String getQrVerification() { return qrVerification; }
    public void setQrVerification(String qrVerification) { this.qrVerification = qrVerification; }

    public List<PrescriptionItem> getItems() { return items; }
    public void setItems(List<PrescriptionItem> items) { this.items = items; }

    public void addItem(PrescriptionItem item) {
        items.add(item);
        item.setPrescription(this);
    }
}
