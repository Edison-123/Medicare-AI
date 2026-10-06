package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "refill_requests")
public class RefillRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long prescriptionId;
    private String prescriptionCode;
    private Long patientId;
    private String patientName;
    private String medicine;
    private String dosage;
    private String lastVitals;
    private String requestedDate;
    private String status; // "Pending", "Approved", "Visit Required"

    @Column(columnDefinition = "TEXT")
    private String notes;

    public RefillRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPrescriptionId() { return prescriptionId; }
    public void setPrescriptionId(Long prescriptionId) { this.prescriptionId = prescriptionId; }

    public String getPrescriptionCode() { return prescriptionCode; }
    public void setPrescriptionCode(String prescriptionCode) { this.prescriptionCode = prescriptionCode; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getMedicine() { return medicine; }
    public void setMedicine(String medicine) { this.medicine = medicine; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getLastVitals() { return lastVitals; }
    public void setLastVitals(String lastVitals) { this.lastVitals = lastVitals; }

    public String getRequestedDate() { return requestedDate; }
    public void setRequestedDate(String requestedDate) { this.requestedDate = requestedDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
