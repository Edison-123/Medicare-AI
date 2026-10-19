package com.medicare.dto;

public class ApiResponse {
    private boolean ok;
    private String message;
    private String status;
    private Boolean isCritical;

    public ApiResponse() {}

    public ApiResponse(boolean ok, String message) {
        this.ok = ok;
        this.message = message;
    }

    public ApiResponse(boolean ok, String message, String status) {
        this.ok = ok;
        this.message = message;
        this.status = status;
    }

    public ApiResponse(boolean ok, String message, Boolean isCritical) {
        this.ok = ok;
        this.message = message;
        this.isCritical = isCritical;
    }

    public boolean isOk() { return ok; }
    public void setOk(boolean ok) { this.ok = ok; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsCritical() { return isCritical; }
    public void setIsCritical(Boolean isCritical) { this.isCritical = isCritical; }
}
