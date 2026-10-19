package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class DrugInteractionService {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private static final String WARNING = "Experimental Ollama screening only. It can miss or misclassify interactions and does not replace a clinical interaction database or pharmacist review.";
    private static final String SYSTEM_PROMPT = """
            You are an experimental, untrusted drug interaction screening assistant, not a medical authority.
            Enumerate EVERY unordered pair from the submitted medications exactly once. For every pair, return
            one assessment with status "potential", "uncertain", or "none_identified". Never omit a pair.
            Use "uncertain" with severity "Review" if you cannot confidently assess it. Use only names from
            the input. Do not invent patient conditions, doses, or evidence. Do not say a regimen is safe.
            Return only JSON in this shape:
            {"pairs":[{"drugs":["submitted drug 1","submitted drug 2"],"status":"potential|uncertain|none_identified","severity":"High|Moderate|Low|Review","effect":"short effect","description":"why this pair may interact or why review is needed","recommendation":"clinical review action"}]}
            """;

    private final Environment environment;
    private final ObjectMapper objectMapper;

    public DrugInteractionService(Environment environment, ObjectMapper objectMapper) {
        this.environment = environment;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> check(Map<String, Object> payload) {
        List<String> drugs = names(payload.get("drugs"));
        if (drugs.size() < 2) {
            throw new IllegalArgumentException("Select at least two medications to check interactions.");
        }
        if (drugs.size() > 20) {
            throw new IllegalArgumentException("Check no more than 20 medications at a time.");
        }

        String model = environment.getProperty("medicare.ai.summary.ollama.model", "qwen2.5:1.5b");
        JsonNode generated = requestModel(model, drugs);
        JsonNode generatedPairs = generated.path("pairs");
        if (!generatedPairs.isArray()) {
            throw new IllegalStateException("The interaction screening model returned an invalid response.");
        }

        List<Map<String, Object>> interactions = new ArrayList<>();
        Set<String> assessedPairs = new HashSet<>();
        for (JsonNode candidate : generatedPairs) {
            PairAssessment assessment = validateAssessment(candidate, drugs);
            if (assessment == null || !assessedPairs.add(assessment.key()))
                continue;
            if (assessment.finding() != null && interactions.size() < 20) {
                interactions.add(assessment.finding());
            }
        }
        int totalPairCount = drugs.size() * (drugs.size() - 1) / 2;
        String reviewStatus = reviewStatus(assessedPairs.size(), totalPairCount, !interactions.isEmpty());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("interactions", interactions);
        response.put("reviewStatus", reviewStatus);
        response.put("assessedPairCount", assessedPairs.size());
        response.put("totalPairCount", totalPairCount);
        response.put("provider", model);
        response.put("warning", WARNING);
        return response;
    }

    static String reviewStatus(int assessedPairCount, int totalPairCount, boolean hasFindings) {
        if (assessedPairCount < totalPairCount)
            return "inconclusive";
        return hasFindings ? "review_required" : "screened_no_potential";
    }

    private JsonNode requestModel(String model, List<String> drugs) {
        String url = environment.getProperty("medicare.ai.summary.ollama.url", "http://localhost:11434/api/chat");
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("stream", false);
            body.put("format", "json");
            body.put("keep_alive", "2m");
            body.put("messages", List.of(
                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                    Map.of("role", "user", "content", objectMapper.writeValueAsString(Map.of("drugs", drugs)))));
            body.put("options", Map.of("temperature", 0, "num_ctx", 4096, "num_predict", 900));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMinutes(2))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalStateException("The configured interaction model returned HTTP "
                        + response.statusCode() + ".");
            }
            String content = objectMapper.readTree(response.body()).path("message").path("content").asText("");
            if (content.isBlank()) {
                throw new IllegalStateException("The configured interaction model returned an empty response.");
            }
            return objectMapper.readTree(content);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Drug interaction screening was interrupted.", exception);
        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Drug interaction screening is unavailable. Start Ollama and install the configured model.",
                    exception);
        }
    }

    private static PairAssessment validateAssessment(JsonNode candidate, List<String> drugs) {
        JsonNode pair = candidate.path("drugs");
        if (!pair.isArray() || pair.size() != 2)
            return null;
        String first = submittedName(pair.get(0).asText(""), drugs);
        String second = submittedName(pair.get(1).asText(""), drugs);
        if (first == null || second == null || first.equalsIgnoreCase(second))
            return null;

        String status = candidate.path("status").asText("").toLowerCase(Locale.ROOT);
        if (!List.of("potential", "uncertain", "none_identified").contains(status))
            return null;
        String key = first.compareToIgnoreCase(second) < 0
                ? first.toLowerCase(Locale.ROOT) + "|" + second.toLowerCase(Locale.ROOT)
                : second.toLowerCase(Locale.ROOT) + "|" + first.toLowerCase(Locale.ROOT);
        if ("none_identified".equals(status))
            return new PairAssessment(key, status, null);

        String severity = switch (candidate.path("severity").asText("").toLowerCase(Locale.ROOT)) {
            case "high" -> "High";
            case "moderate" -> "Moderate";
            case "low" -> "Low";
            default -> "Review";
        };
        if ("uncertain".equals(status))
            severity = "Review";
        Map<String, Object> interaction = new LinkedHashMap<>();
        interaction.put("drugs", List.of(first, second));
        interaction.put("severity", severity);
        interaction.put("status", status);
        interaction.put("effect", text(candidate.path("effect").asText("")));
        interaction.put("description", text(candidate.path("description").asText("")));
        interaction.put("recommendation", text(candidate.path("recommendation").asText("")));
        return new PairAssessment(key, status, interaction);
    }

    private record PairAssessment(String key, String status, Map<String, Object> finding) {
    }

    private static String submittedName(String candidate, List<String> drugs) {
        return drugs.stream().filter(name -> name.equalsIgnoreCase(candidate.trim())).findFirst().orElse(null);
    }

    private static List<String> names(Object value) {
        if (!(value instanceof List<?> values))
            return List.of();
        return values.stream()
                .map(item -> item == null ? "" : String.valueOf(item).trim())
                .filter(name -> !name.isBlank())
                .distinct()
                .toList();
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }
}