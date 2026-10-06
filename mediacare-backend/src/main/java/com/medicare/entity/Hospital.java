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
    private Integer bedsOccupied;
    private String status;
    private String apiStatus;
    private String complianceCert;

    public Hospital() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public Integer getBedsOccupied() { return bedsOccupied; }
    public void setBedsOccupied(Integer bedsOccupied) { this.bedsOccupied = bedsOccupied; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getApiStatus() { return apiStatus; }
    public void setApiStatus(String apiStatus) { this.apiStatus = apiStatus; }

    public String getComplianceCert() { return complianceCert; }
    public void setComplianceCert(String complianceCert) { this.complianceCert = complianceCert; }
}
