package com.medicare.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ChangePasswordRequestTest {

    private static jakarta.validation.ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        validatorFactory.close();
    }

    @Test
    void acceptsStrongPassword() {
        ChangePasswordRequest request = requestWithPassword("MediCareChange42!");

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void rejectsPasswordWithoutRequiredStrength() {
        ChangePasswordRequest request = requestWithPassword("password123");

        assertTrue(validator.validate(request).stream()
                .anyMatch(error -> error.getPropertyPath().toString().equals("newPassword")));
    }

    private ChangePasswordRequest requestWithPassword(String password) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("OldPassword!1");
        request.setNewPassword(password);
        return request;
    }
}