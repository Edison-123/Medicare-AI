package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vitals_logs")
public class VitalLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientId;

    private Integer bpSys;
    private Integer bpDia;

    private Integer heartRate;

    private Integer spo2;

    private Integer glucose;

    private Double weightKg;

    private Boolean isCritical;

    private String measuredAt;

    private String source; // HOME, CLINIC

    public VitalLog() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public Integer getBpSys() {
        return bpSys;
    }

    public void setBpSys(Integer bpSys) {
        this.bpSys = bpSys;
    }

    public Integer getBpDia() {
        return bpDia;
    }

    public void setBpDia(Integer bpDia) {
        this.bpDia = bpDia;
    }

    public Integer getHeartRate() {
        return heartRate;
    }

    public void setHeartRate(Integer heartRate) {
        this.heartRate = heartRate;
    }

    public Integer getSpo2() {
        return spo2;
    }

    public void setSpo2(Integer spo2) {
        this.spo2 = spo2;
    }

    public Integer getGlucose() {
        return glucose;
    }

    public void setGlucose(Integer glucose) {
        this.glucose = glucose;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public Boolean getIsCritical() {
        return isCritical;
    }

    public void setIsCritical(Boolean isCritical) {
        this.isCritical = isCritical;
    }

    public String getMeasuredAt() {
        return measuredAt;
    }

    public void setMeasuredAt(String measuredAt) {
        this.measuredAt = measuredAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}