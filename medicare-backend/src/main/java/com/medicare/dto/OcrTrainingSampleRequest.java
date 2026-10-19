package com.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OcrTrainingSampleRequest(
        @NotBlank @Size(max = 16_777_216) String image,
        @NotBlank @Size(max = 20_000) String transcription,
        @Size(max = 20_000) String recognizedText) {
}