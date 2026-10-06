package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "patient_documents")
public class PatientDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String name;

    private String category;
    private String date;
    private String size;
    private String provider;

    public PatientDocument() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
}
