package com.medicare.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/drugs")
@Tag(name = "Drug Formulary", description = "Hospital formulary lookup")
public class DrugController {

    private static final List<String> DRUG_DATABASE = List.of(
            "Amlodipine Besylate", "Metformin HCl", "Lisinopril", "Atorvastatin Calcium",
            "Levothyroxine", "Albuterol Sulfate", "Omeprazole", "Losartan Potassium",
            "Hydrochlorothiazide", "Gabapentin", "Sertraline", "Metoprolol Succinate",
            "Amoxicillin", "Clopidogrel", "Fluticasone Propionate", "Montelukast"
    );

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Get hospital formulary drug database list")
    public ResponseEntity<List<String>> getDrugs() {
        return ResponseEntity.ok(DRUG_DATABASE);
    }
}
