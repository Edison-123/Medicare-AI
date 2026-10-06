package com.medicare.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String roleKind; // "doctor", "patient", "admin"
    private Long userId;
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String link;
    private String timeAgo;
    private Boolean unread;

    public Notification() {}

    public Notification(String roleKind, Long userId, String title, String message, String link, String timeAgo, Boolean unread) {
        this.roleKind = roleKind;
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.link = link;
        this.timeAgo = timeAgo;
        this.unread = unread;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoleKind() { return roleKind; }
    public void setRoleKind(String roleKind) { this.roleKind = roleKind; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public String getTimeAgo() { return timeAgo; }
    public void setTimeAgo(String timeAgo) { this.timeAgo = timeAgo; }

    public Boolean getUnread() { return unread; }
    public void setUnread(Boolean unread) { this.unread = unread; }
}
