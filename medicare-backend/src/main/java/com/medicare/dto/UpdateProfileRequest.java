package com.medicare.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    private String phone;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    public UpdateProfileRequest() {}

    public UpdateProfileRequest(String phone, String address) {
        this.phone = phone;
        this.address = address;
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
