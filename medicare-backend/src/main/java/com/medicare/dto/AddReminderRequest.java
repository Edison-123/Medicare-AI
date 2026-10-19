package com.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AddReminderRequest {

    @NotBlank(message = "Medicine name is required")
    @Size(max = 100, message = "Medicine name cannot exceed 100 characters")
    private String medicineName;

    @Size(max = 50)
    private String strength;

    @Size(max = 50)
    private String dosage;

    @Size(max = 50)
    private String slot;

    @Size(max = 50)
    private String time;

    @Size(max = 100)
    private String food;

    @Size(max = 255)
    private String instructions;

    private Integer totalPills;
    private Integer remainingPills;

    public AddReminderRequest() {}

    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }

    public String getStrength() { return strength; }
    public void setStrength(String strength) { this.strength = strength; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getSlot() { return slot; }
    public void setSlot(String slot) { this.slot = slot; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getFood() { return food; }
    public void setFood(String food) { this.food = food; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public Integer getTotalPills() { return totalPills; }
    public void setTotalPills(Integer totalPills) { this.totalPills = totalPills; }

    public Integer getRemainingPills() { return remainingPills; }
    public void setRemainingPills(Integer remainingPills) { this.remainingPills = remainingPills; }
}
