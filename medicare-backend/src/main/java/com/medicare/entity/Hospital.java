package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "hospitals")
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String code;
    private String city;
    private String type;
    private String address;
    private String director;
    private Integer departmentsCount;
    private Integer doctorsCount;
    private Integer bedsTotal;
    private Integer bedsOccupied;
    private String status;
    private String apiStatus;
    private String complianceCert;
    @Transient
    private Long patientCount;
    @Transient
    private Long doctorCount;
    @Transient
    private Long departmentCount;

    public Hospital() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getDirector() {
        return director;
    }

    public void setDirector(String director) {
        this.director = director;
    }

    public Integer getDepartmentsCount() {
        return departmentsCount;
    }

    public void setDepartmentsCount(Integer departmentsCount) {
        this.departmentsCount = departmentsCount;
    }

    public Integer getDoctorsCount() {
        return doctorsCount;
    }

    public void setDoctorsCount(Integer doctorsCount) {
        this.doctorsCount = doctorsCount;
    }

    public Integer getBedsTotal() {
        return bedsTotal;
    }

    public void setBedsTotal(Integer bedsTotal) {
        this.bedsTotal = bedsTotal;
    }

    public Integer getBedsOccupied() {
        return bedsOccupied;
    }

    public void setBedsOccupied(Integer bedsOccupied) {
        this.bedsOccupied = bedsOccupied;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getApiStatus() {
        return apiStatus;
    }

    public void setApiStatus(String apiStatus) {
        this.apiStatus = apiStatus;
    }

    public String getComplianceCert() {
        return complianceCert;
    }

    public void setComplianceCert(String complianceCert) {
        this.complianceCert = complianceCert;
    }

    public Long getPatientCount() {
        return patientCount;
    }

    public void setPatientCount(Long patientCount) {
        this.patientCount = patientCount;
    }

    public Long getDoctorCount() {
        return doctorCount;
    }

    public void setDoctorCount(Long doctorCount) {
        this.doctorCount = doctorCount;
    }

    public Long getDepartmentCount() {
        return departmentCount;
    }

    public void setDepartmentCount(Long departmentCount) {
        this.departmentCount = departmentCount;
    }
}
