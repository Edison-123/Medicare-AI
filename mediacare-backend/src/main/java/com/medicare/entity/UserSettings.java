package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_settings", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "role_kind"}))
public class UserSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "role_kind", nullable = false, length = 30)
    private String roleKind;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String settingsJson;

    public UserSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getRoleKind() { return roleKind; }
    public void setRoleKind(String roleKind) { this.roleKind = roleKind; }
    public String getSettingsJson() { return settingsJson; }
    public void setSettingsJson(String settingsJson) { this.settingsJson = settingsJson; }
}
