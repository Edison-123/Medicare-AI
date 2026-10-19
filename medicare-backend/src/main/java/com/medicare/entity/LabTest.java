package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "lab_tests")
public class LabTest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String testName;

    private String category;
    private String date;
    private String orderingDoctor;
    private String facility;
    private String status;

    @Column(columnDefinition = "TEXT")
    private String analytesJson;

    @Column(columnDefinition = "TEXT")
    private String doctorComment;

    public LabTest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getOrderingDoctor() { return orderingDoctor; }
    public void setOrderingDoctor(String orderingDoctor) { this.orderingDoctor = orderingDoctor; }
    public String getFacility() { return facility; }
    public void setFacility(String facility) { this.facility = facility; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAnalytesJson() { return analytesJson; }
    public void setAnalytesJson(String analytesJson) { this.analytesJson = analytesJson; }
    public String getDoctorComment() { return doctorComment; }
    public void setDoctorComment(String doctorComment) { this.doctorComment = doctorComment; }
}
