package com.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class BookAppointmentRequest {

    @NotNull(message = "Doctor is required")
    private Long doctorId;

    @NotBlank(message = "Doctor name is required")
    @Size(max = 100)
    private String doctor;

    @Size(max = 100)
    private String specialty;

    @Size(max = 100)
    private String hospital;

    @NotBlank(message = "Date is required")
    private String date;

    @NotBlank(message = "Time is required")
    private String time;

    @Size(max = 50)
    private String type;

    @Size(max = 50)
    private String room;

    @Size(max = 255)
    private String reason;

    public BookAppointmentRequest() {}

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

    public String getDoctor() { return doctor; }
    public void setDoctor(String doctor) { this.doctor = doctor; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
