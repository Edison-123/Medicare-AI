package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.dto.OcrTrainingSampleRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OcrTrainingSampleServiceTest {

    @TempDir
    Path storageDirectory;

    @Test
    void storesPngWithGroundTruthAndOcrPrediction() throws Exception {
        byte[] imageBytes = pngImage();
        OcrTrainingSampleService service = new OcrTrainingSampleService(
                new ObjectMapper(), storageDirectory.toString());

        String sampleId = service.save(new OcrTrainingSampleRequest(
                "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes),
                "Take one tablet daily",
                "Take 1 tablet daily"));

        Path sampleDirectory = storageDirectory.resolve(sampleId);
        assertTrue(Files.isDirectory(sampleDirectory));
        assertArrayEquals(imageBytes, Files.readAllBytes(sampleDirectory.resolve("sample.png")));

        JsonNode labels = new ObjectMapper().readTree(sampleDirectory.resolve("labels.json").toFile());
        assertEquals("Take one tablet daily", labels.get("transcription").asText());
        assertEquals("Take 1 tablet daily", labels.get("recognizedText").asText());
        assertEquals("medicare-ocr-training-v1", labels.get("schemaVersion").asText());
    }

    @Test
    void rejectsNonPngImageData() {
        OcrTrainingSampleService service = new OcrTrainingSampleService(
                new ObjectMapper(), storageDirectory.toString());

        assertThrows(IllegalArgumentException.class, () -> service.save(new OcrTrainingSampleRequest(
                "data:image/jpeg;base64,ZmFrZQ==",
                "sample text",
                "sample text")));
    }

    private byte[] pngImage() throws IOException {
        BufferedImage image = new BufferedImage(20, 12, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
