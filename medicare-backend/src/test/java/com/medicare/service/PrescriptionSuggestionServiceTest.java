package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PrescriptionSuggestionServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void extractsStatedMedicationDetailsAndDropsUnsupportedModelValues() throws Exception {
        String source = "Paracetamol - 3 days - twice a day -100mg";
        JsonNode modelItem = objectMapper.readTree("""
                {
                  "name": "Paracetamol",
                  "strength": "100 mg",
                  "dosage": "100 mg",
                  "frequency": "Twice daily",
                  "duration": "3 days",
                  "route": "Oral",
                  "food": "Any",
                  "instructions": "As needed"
                }
                """);

        Map<String, String> mapped = PrescriptionSuggestionService.extractPrescribedMedication(modelItem, source);

        assertEquals("Paracetamol", mapped.get("name"));
        assertEquals("", mapped.get("strength"));
        assertEquals("100 mg", mapped.get("dosage"));
        assertEquals("Twice daily", mapped.get("frequency"));
        assertEquals("3 days", mapped.get("duration"));
        assertEquals("", mapped.get("route"));
        assertEquals("", mapped.get("food"));
        assertEquals("", mapped.get("instructions"));
    }

    @Test
    void mapsEverySemicolonAndNewlineSeparatedMedicineIndependently() {
        String source = "Paracetamol - 3 days - twice a day -100mg;\nAmoxicillin- 3 days - twice a day -100mg;";
        List<String> lines = PrescriptionSuggestionService.medicationLines(source);

        assertEquals(2, lines.size());
        Map<String, String> paracetamol = PrescriptionSuggestionService.extractPrescribedMedication(null, lines.get(0));
        Map<String, String> amoxicillin = PrescriptionSuggestionService.extractPrescribedMedication(null, lines.get(1));

        assertEquals("Paracetamol", paracetamol.get("name"));
        assertEquals("100 mg", paracetamol.get("dosage"));
        assertEquals("Twice daily", paracetamol.get("frequency"));
        assertEquals("3 days", paracetamol.get("duration"));
        assertEquals("Amoxicillin", amoxicillin.get("name"));
        assertEquals("100 mg", amoxicillin.get("dosage"));
        assertEquals("Twice daily", amoxicillin.get("frequency"));
        assertEquals("3 days", amoxicillin.get("duration"));
    }
}