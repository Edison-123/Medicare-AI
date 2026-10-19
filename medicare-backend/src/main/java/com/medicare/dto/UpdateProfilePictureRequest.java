package com.medicare.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfilePictureRequest {
    @Size(max = 1_400_000)
    private String profilePicture;

    public String getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(String profilePicture) {
        this.profilePicture = profilePicture;
    }
}