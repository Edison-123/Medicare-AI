package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "doctors")
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String specialization;

    @Column(unique = true)
    private String licenseNumber;

    private String hospital;

    @Column(unique = true)
    private String email;
    private String phone;
    private Double rating;
    private String status;

    public Doctor() {}

    public Doctor(String name, String specialization, String licenseNumber, String hospital, String email, String phone, Double rating, String status) {
        this.name = name;
        this.specialization = specialization;
        this.licenseNumber = licenseNumber;
        this.hospital = hospital;
        this.email = email;
        this.phone = phone;
        this.rating = rating;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
