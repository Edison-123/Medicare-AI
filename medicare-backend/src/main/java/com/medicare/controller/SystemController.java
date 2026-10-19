package com.medicare.controller;

import com.medicare.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/system")
public class SystemController {

    private final AdminService adminService;

    public SystemController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/workflow-settings")
    public ResponseEntity<Map<String, Object>> getWorkflowSettings() {
        return ResponseEntity.ok(adminService.getWorkflowSettings());
    }
}