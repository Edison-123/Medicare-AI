package com.medicare.dto;

public class RefillActionRequest {
    private String action; // "approve" or "visit_required"
    private String reason;

    public RefillActionRequest() {}

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
