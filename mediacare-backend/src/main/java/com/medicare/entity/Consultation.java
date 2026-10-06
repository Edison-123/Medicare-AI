package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "consultations")
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Links this consultation to the appointment
     * from which it was created.
     */
    @Column(unique = true)
    private Long appointmentId;

    private Long doctorId;
    private String doctorName;

    private Long patientId;
    private String patientName;

    private String date;
    private String time;

    private String type;
    private String status;

    private String room;
    private String chiefComplaint;

    @Column(columnDefinition = "TEXT")
    private String doctorNotes;

    @Column(columnDefinition = "TEXT")
    private String keyTakeaway;

    private String vitalsAtVisit;

    @Column(columnDefinition = "TEXT")
    private String patientInstructions;

    @Column(columnDefinition = "LONGTEXT")
    private String clinicalFormJson;

    @Column(columnDefinition = "LONGTEXT")
    private String aiStateJson;

    public Consultation() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(Long appointmentId) {
        this.appointmentId = appointmentId;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    /*
     * Frontend compatibility.
     */
    public String getDoctor() {
        return doctorName;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    /*
     * Frontend compatibility.
     */
    public String getPatient() {
        return patientName;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getChiefComplaint() {
        return chiefComplaint;
    }

    public void setChiefComplaint(String chiefComplaint) {
        this.chiefComplaint = chiefComplaint;
    }

    public String getDoctorNotes() {
        return doctorNotes;
    }

    public void setDoctorNotes(String doctorNotes) {
        this.doctorNotes = doctorNotes;
    }

    public String getKeyTakeaway() {
        return keyTakeaway;
    }

    public void setKeyTakeaway(String keyTakeaway) {
        this.keyTakeaway = keyTakeaway;
    }

    public String getVitalsAtVisit() {
        return vitalsAtVisit;
    }

    public void setVitalsAtVisit(String vitalsAtVisit) {
        this.vitalsAtVisit = vitalsAtVisit;
    }

    public String getPatientInstructions() {
        return patientInstructions;
    }

    public void setPatientInstructions(String patientInstructions) {
        this.patientInstructions = patientInstructions;
    }

    public String getClinicalFormJson() {
        return clinicalFormJson;
    }

    public void setClinicalFormJson(String clinicalFormJson) {
        this.clinicalFormJson = clinicalFormJson;
    }

    public String getAiStateJson() {
        return aiStateJson;
    }

    public void setAiStateJson(String aiStateJson) {
        this.aiStateJson = aiStateJson;
    }
}