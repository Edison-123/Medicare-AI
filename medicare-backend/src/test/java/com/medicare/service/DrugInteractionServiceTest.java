package com.medicare.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DrugInteractionServiceTest {

    @Test
    void missingPairAssessmentsAreInconclusiveEvenWhenModelReturnsNoFindings() {
        assertEquals("inconclusive", DrugInteractionService.reviewStatus(0, 1, false));
        assertEquals("inconclusive", DrugInteractionService.reviewStatus(2, 3, false));
    }

    @Test
    void completePairCoverageDistinguishesFindingsFromNoPotentialFindings() {
        assertEquals("review_required", DrugInteractionService.reviewStatus(3, 3, true));
        assertEquals("screened_no_potential", DrugInteractionService.reviewStatus(3, 3, false));
    }
}