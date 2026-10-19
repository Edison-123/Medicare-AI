package com.medicare.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.dto.OcrTrainingSampleRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Base64;
import java.util.Iterator;
import java.util.UUID;

@Service
public class OcrTrainingSampleService {

    private static final String PNG_PREFIX = "data:image/png;base64,";
    private static final int MAX_IMAGE_BYTES = 12 * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 20_000_000L;

    private final ObjectMapper objectMapper;
    private final Path storageDirectory;

    public OcrTrainingSampleService(
            ObjectMapper objectMapper,
            @Value("${MEDICARE_OCR_TRAINING_DIR:training-data/ocr}") String storageDirectory) {
        this.objectMapper = objectMapper;
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    public String save(OcrTrainingSampleRequest request) {
        byte[] imageBytes = decodePng(request.image());
        verifyPng(imageBytes);

        String sampleId = UUID.randomUUID().toString();
        Path stagingDirectory = storageDirectory.resolve("." + sampleId + ".tmp");
        Path sampleDirectory = storageDirectory.resolve(sampleId);

        try {
            Files.createDirectories(storageDirectory);
            Files.createDirectory(stagingDirectory);
            Files.write(stagingDirectory.resolve("sample.png"), imageBytes);
            SampleMetadata metadata = new SampleMetadata(
                    "medicare-ocr-training-v1",
                    "sample.png",
                    request.transcription().trim(),
                    request.recognizedText() == null ? "" : request.recognizedText().trim(),
                    Instant.now().toString());
            Files.writeString(
                    stagingDirectory.resolve("labels.json"),
                    objectMapper.writeValueAsString(metadata),
                    StandardCharsets.UTF_8);

            try {
                Files.move(stagingDirectory, sampleDirectory, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(stagingDirectory, sampleDirectory);
            }
            return sampleId;
        } catch (IOException exception) {
            removePartialSample(stagingDirectory);
            throw new IllegalStateException("The OCR training sample could not be stored.", exception);
        }
    }

    private byte[] decodePng(String dataUrl) {
        if (dataUrl == null || !dataUrl.startsWith(PNG_PREFIX)) {
            throw new IllegalArgumentException("A PNG handwriting image is required.");
        }

        byte[] imageBytes;
        try {
            imageBytes = Base64.getDecoder().decode(dataUrl.substring(PNG_PREFIX.length()));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("The handwriting image is not valid base64 data.", exception);
        }

        if (imageBytes.length == 0 || imageBytes.length > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("The handwriting image must be smaller than 12 MB.");
        }
        return imageBytes;
    }

    private void verifyPng(byte[] imageBytes) {
        try (ImageInputStream imageInput = ImageIO.createImageInputStream(new ByteArrayInputStream(imageBytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("The handwriting image is not a readable PNG.");
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(imageInput, true, true);
                if (!"png".equalsIgnoreCase(reader.getFormatName())) {
                    throw new IllegalArgumentException("The handwriting image must be a PNG.");
                }
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels == 0 || pixels > MAX_IMAGE_PIXELS) {
                    throw new IllegalArgumentException("The handwriting image dimensions are too large.");
                }
                if (reader.read(0) == null) {
                    throw new IllegalArgumentException("The handwriting image is not a readable PNG.");
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("The handwriting image is not a readable PNG.", exception);
        }
    }

    private void removePartialSample(Path stagingDirectory) {
        try {
            Files.deleteIfExists(stagingDirectory.resolve("sample.png"));
            Files.deleteIfExists(stagingDirectory.resolve("labels.json"));
            Files.deleteIfExists(stagingDirectory);
        } catch (IOException ignored) {
        }
    }

    private record SampleMetadata(
            String schemaVersion,
            String imageFile,
            String transcription,
            String recognizedText,
            String createdAt) {
    }
}