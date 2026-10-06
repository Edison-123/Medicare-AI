package com.medicare.dto;

public class VitalLogRequest {

    private String bpSys;
    private String bpDia;
    private String hr;
    private String spo2;
    private String glucose;
    private String weightKg;

    public VitalLogRequest() {}

    public String getBpSys() {
        return bpSys;
    }

    public void setBpSys(String bpSys) {
        this.bpSys = bpSys;
    }

    public String getBpDia() {
        return bpDia;
    }

    public void setBpDia(String bpDia) {
        this.bpDia = bpDia;
    }

    public String getHr() {
        return hr;
    }

    public void setHr(String hr) {
        this.hr = hr;
    }

    public String getSpo2() {
        return spo2;
    }

    public void setSpo2(String spo2) {
        this.spo2 = spo2;
    }

    public String getGlucose() {
        return glucose;
    }

    public void setGlucose(String glucose) {
        this.glucose = glucose;
    }

    public String getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(String weightKg) {
        this.weightKg = weightKg;
    }
}