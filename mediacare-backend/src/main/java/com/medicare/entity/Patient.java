package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "patients")
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;
    private String phone;
    private String dob;
    private Integer age;
    private String gender;
    private String bloodGroup;
    private Integer heightCm;
    private Integer weightKg;
    private Double bmi;
    private String address;
    private String healthCardNumber;
    private String insuranceProvider;
    private String insurancePolicy;
    private String riskCategory;
    private String status = "Active";
    private String lastVisit;
    private String nextAppt;
    private String hospital;
    private String primaryDoctor;

    @Column(columnDefinition = "TEXT")
    private String vaccinationsJson;

    @Column(columnDefinition = "TEXT")
    private String surgeriesJson;

    @Column(columnDefinition = "TEXT")
    private String familyHistoryJson;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "patient_allergies", joinColumns = @JoinColumn(name = "patient_id"))
    @Column(name = "allergy")
    private java.util.List<String> allergies = new java.util.ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "patient_conditions", joinColumns = @JoinColumn(name = "patient_id"))
    @Column(name = "condition_name")
    private java.util.List<String> conditions = new java.util.ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "patient_meds", joinColumns = @JoinColumn(name = "patient_id"))
    @Column(name = "med_name")
    private java.util.List<String> meds = new java.util.ArrayList<>();

    public Patient() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public Integer getHeightCm() { return heightCm; }
    public void setHeightCm(Integer heightCm) { this.heightCm = heightCm; }

    public Integer getWeightKg() { return weightKg; }
    public void setWeightKg(Integer weightKg) { this.weightKg = weightKg; }

    public Double getBmi() { return bmi; }
    public void setBmi(Double bmi) { this.bmi = bmi; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getHealthCardNumber() { return healthCardNumber; }
    public void setHealthCardNumber(String healthCardNumber) { this.healthCardNumber = healthCardNumber; }

    public String getInsuranceProvider() { return insuranceProvider; }
    public void setInsuranceProvider(String insuranceProvider) { this.insuranceProvider = insuranceProvider; }

    public String getInsurancePolicy() { return insurancePolicy; }
    public void setInsurancePolicy(String insurancePolicy) { this.insurancePolicy = insurancePolicy; }

    public String getRiskCategory() { return riskCategory; }
    public void setRiskCategory(String riskCategory) { this.riskCategory = riskCategory; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLastVisit() { return lastVisit; }
    public void setLastVisit(String lastVisit) { this.lastVisit = lastVisit; }

    public String getNextAppt() { return nextAppt; }
    public void setNextAppt(String nextAppt) { this.nextAppt = nextAppt; }

    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }

    public String getPrimaryDoctor() { return primaryDoctor; }
    public void setPrimaryDoctor(String primaryDoctor) { this.primaryDoctor = primaryDoctor; }

    public String getVaccinationsJson() { return vaccinationsJson; }
    public void setVaccinationsJson(String vaccinationsJson) { this.vaccinationsJson = vaccinationsJson; }

    public String getSurgeriesJson() { return surgeriesJson; }
    public void setSurgeriesJson(String surgeriesJson) { this.surgeriesJson = surgeriesJson; }

    public String getFamilyHistoryJson() { return familyHistoryJson; }
    public void setFamilyHistoryJson(String familyHistoryJson) { this.familyHistoryJson = familyHistoryJson; }

    public java.util.List<String> getAllergies() { return allergies; }
    public void setAllergies(java.util.List<String> allergies) { this.allergies = allergies; }

    public java.util.List<String> getConditions() { return conditions; }
    public void setConditions(java.util.List<String> conditions) { this.conditions = conditions; }

    public java.util.List<String> getMeds() { return meds; }
    public void setMeds(java.util.List<String> meds) { this.meds = meds; }
}
