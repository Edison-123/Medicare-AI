package com.medicare.dto;

public class UserDto {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String sub;
    private String profilePicture;

    public UserDto() {
    }

    public UserDto(Long id, String name, String email, String role, String sub) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.sub = sub;
    }

    public UserDto(Long id, String name, String email, String role, String sub, String profilePicture) {
        this(id, name, email, role, sub);
        this.profilePicture = profilePicture;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getSub() {
        return sub;
    }

    public void setSub(String sub) {
        this.sub = sub;
    }

    public String getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(String profilePicture) {
        this.profilePicture = profilePicture;
    }
}
