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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PrescriptionSuggestionService {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private static final Pattern MEDICATION_NAME = Pattern.compile("^\\s*(.+?)\\s*-\\s+(?=\\S)");
    private static final Pattern MEDICATION_DURATION = Pattern
            .compile("(?i)\\b\\d+(?:\\.\\d+)?\\s*(?:days?|weeks?|months?)\\b");
    private static final Pattern MEDICATION_DOSAGE = Pattern.compile(
            "(?i)\\b\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|µg|μg|g|ml|units?|tablets?|capsules?|puffs?|drops?)\\b");
    private static final String SYSTEM_PROMPT = """
            You map doctor-provided medication instructions into structured prescription fields for an
            untrusted draft that a licensed clinician must review. If prescribedMedications is non-empty,
            use extraction mode: create one item for each explicitly prescribed medicine in that text,
            and do not add, replace, or recommend medicines. Copy only details explicitly stated in the
            medication text. Map the medicine name, strength, dosage, frequency, duration, route, food
            instructions, and other directions to their matching fields. Leave any unstated field empty;
            never infer a dose, route, frequency, duration, or food instruction. If the text does not
            identify a medicine, return an empty items array. For example, "Paracetamol - 3 days - twice a day - 100mg"
            maps to name "Paracetamol", dosage "100 mg", frequency "Twice daily", duration "3 days", and empty
            strength, route, food, and instructions. Use these exact frequency values when supported:
            "Once daily", "Twice daily", "Three times daily", "Four times daily", "At bedtime", "As needed".
            Use these exact route values when supported: "Oral", "Inhaled", "Topical", "Injection",
            "Eye/Ear drops", "Other". Use these exact food values when supported: "Before food",
            "After food", "With food", "Any". If prescribedMedications is empty, use
            suggestion mode: use only the supplied diagnosis, clinical information, current medications,
            and allergies; do not diagnose or invent patient facts. Do not claim an interaction or allergy
            check was performed or imply that a medicine is safe. Return only valid JSON with this shape:
            {"items":[{"name":"","strength":"","dosage":"","frequency":"","duration":"","route":"","food":"","instructions":""}]}
            Do not include markdown or prose outside the JSON object. The clinician will review and edit
            every mapped detail or suggestion before approving or issuing a prescription.
            """;

    private final Environment environment;
    private final ObjectMapper objectMapper;

    public PrescriptionSuggestionService(Environment environment, ObjectMapper objectMapper) {
        this.environment = environment;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> suggest(Map<String, Object> requestBody) {
        String diagnosis = text(requestBody.get("diagnosis"));
        String clinicalInfo = text(requestBody.get("clinicalInfo"));
        String prescribedMedications = text(requestBody.get("prescribedMedications"));
        if (diagnosis.isBlank() && clinicalInfo.isBlank()) {
            throw new IllegalArgumentException("Enter a diagnosis or clinical information first.");
        }

        String model = environment.getProperty("medicare.ai.summary.ollama.model", "qwen2.5:1.5b");
        List<Map<String, String>> items = new ArrayList<>();
        if (prescribedMedications.isBlank()) {
            JsonNode generated = requestModel(model, context(diagnosis, clinicalInfo, "", requestBody));
            JsonNode itemsNode = generated.path("items");
            if (!itemsNode.isArray()) {
                throw new IllegalStateException(
                        "The prescription assistant returned an invalid response. Please retry.");
            }
            for (JsonNode itemNode : itemsNode) {
                Map<String, String> item = readSuggestion(itemNode);
                if (item != null) {
                    items.add(item);
                    if (items.size() == 6)
                        break;
                }
            }
        } else {
            for (String medicationLine : medicationLines(prescribedMedications)) {
                if (items.size() == 6)
                    break;
                requestModel(model, context(diagnosis, medicationLine, medicationLine, requestBody));
                Map<String, String> item = extractPrescribedMedication(null, medicationLine);
                if (item != null)
                    items.add(item);
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("items", items);
        response.put("provider", model);
        response.put("warning",
                "AI suggestions are drafts only. Verify each item, dose, allergy, and interaction before approval.");
        return response;
    }

    private Map<String, Object> context(String diagnosis, String clinicalInfo, String prescribedMedications,
            Map<String, Object> requestBody) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("diagnosis", diagnosis);
        context.put("clinicalInfo", clinicalInfo);
        context.put("prescribedMedications", prescribedMedications);
        context.put("allergies", stringList(requestBody.get("allergies")));
        context.put("currentMedications", stringList(requestBody.get("currentMedications")));
        return context;
    }

    static List<String> medicationLines(String source) {
        return List.of(source.split("[;\\r\\n]+")).stream()
                .map(line -> line.replaceFirst("^\\s*(?:[-*]|\\d+[.)])\\s*", "").trim())
                .filter(line -> !line.isBlank())
                .toList();
    }

    private Map<String, String> readSuggestion(JsonNode itemNode) {
        String name = text(itemNode.path("name").asText(""));
        if (name.isBlank()) {
            return null;
        }
        Map<String, String> item = new LinkedHashMap<>();
        item.put("name", name);
        item.put("strength", text(itemNode.path("strength").asText("")));
        item.put("dosage", text(itemNode.path("dosage").asText("")));
        item.put("frequency", text(itemNode.path("frequency").asText("")));
        item.put("duration", text(itemNode.path("duration").asText("")));
        item.put("route", text(itemNode.path("route").asText("")));
        item.put("food", text(itemNode.path("food").asText("")));
        item.put("instructions", text(itemNode.path("instructions").asText("")));
        return item;
    }

    static Map<String, String> extractPrescribedMedication(JsonNode itemNode, String source) {
        String itemSource = source.trim();
        Matcher nameMatcher = MEDICATION_NAME.matcher(itemSource);
        String name = nameMatcher.find()
                ? nameMatcher.group(1).trim()
                : text(itemNode == null ? "" : itemNode.path("name").asText(""));
        if (name.isBlank() || !containsNormalized(itemSource, name))
            return null;

        Map<String, String> item = new LinkedHashMap<>();
        item.put("name", name);
        item.put("strength", "");
        item.put("dosage", find(MEDICATION_DOSAGE, itemSource));
        item.put("frequency", canonicalFrequency(itemSource));
        item.put("duration", find(MEDICATION_DURATION, itemSource));
        item.put("route", canonicalRoute(itemSource));
        item.put("food", canonicalFood(itemSource));
        item.put("instructions", "");
        return item;
    }

    private static String find(Pattern pattern, String source) {
        Matcher matcher = pattern.matcher(source);
        return matcher.find()
                ? matcher.group()
                        .replaceAll("(?i)(\\d)(mg|mcg|µg|μg|g|ml|units?|tablets?|capsules?|puffs?|drops?)\\b", "$1 $2")
                        .trim()
                : "";
    }

    private static String canonicalFrequency(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.matches("(?s).*\\b(as needed|when needed|prn)\\b.*"))
            return "As needed";
        if (normalized.matches("(?s).*\\b(bedtime|at night|nightly|hs)\\b.*"))
            return "At bedtime";
        if (normalized.matches("(?s).*\\b(four times|4 times|qid)\\b.*"))
            return "Four times daily";
        if (normalized.matches("(?s).*\\b(three times|3 times|tid|tds)\\b.*"))
            return "Three times daily";
        if (normalized.matches("(?s).*\\b(twice|two times|2 times|bid)\\b.*"))
            return "Twice daily";
        if (normalized.matches("(?s).*\\b(once|one time|daily|every day|qd)\\b.*"))
            return "Once daily";
        return "";
    }

    private static String canonicalRoute(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.matches("(?s).*\\b(oral|mouth|po)\\b.*"))
            return "Oral";
        if (normalized.contains("inhal"))
            return "Inhaled";
        if (normalized.matches("(?s).*\\b(topical|skin)\\b.*"))
            return "Topical";
        if (normalized.matches("(?s).*\\b(injection|inject|iv|im)\\b.*"))
            return "Injection";
        if (normalized.matches("(?s).*\\b(eye|ear|drops?)\\b.*"))
            return "Eye/Ear drops";
        if (normalized.matches("(?s).*\\bother\\b.*"))
            return "Other";
        return "";
    }

    private static String canonicalFood(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.matches("(?s).*\\b(before|prior to)\\b.*(food|meal).*"))
            return "Before food";
        if (normalized.matches("(?s).*\\b(after|following)\\b.*(food|meal|breakfast|lunch|dinner).*"))
            return "After food";
        if (normalized.matches("(?s).*\\b(with|during)\\b.*(food|meal).*"))
            return "With food";
        if (normalized.matches("(?s).*\\b(any|no)\\b.*(food|meal|time).*"))
            return "Any";
        return "";
    }

    private static boolean containsNormalized(String source, String candidate) {
        String normalizedSource = source.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}.]", "");
        String normalizedCandidate = candidate.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}.]", "");
        return !normalizedCandidate.isBlank() && normalizedSource.contains(normalizedCandidate);
    }

    private JsonNode requestModel(String model, Map<String, Object> context) {
        String url = environment.getProperty("medicare.ai.summary.ollama.url", "http://localhost:11434/api/chat");
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("stream", false);
            body.put("format", "json");
            body.put("keep_alive", "2m");
            body.put("messages", List.of(
                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                    Map.of("role", "user", "content", objectMapper.writeValueAsString(context))));
            body.put("options", Map.of("temperature", 0, "num_ctx", 4096, "num_predict", 900));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMinutes(2))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalStateException("The configured prescription model returned HTTP "
                        + response.statusCode() + ".");
            }
            String content = objectMapper.readTree(response.body()).path("message").path("content").asText("");
            if (content.isBlank()) {
                throw new IllegalStateException("The configured prescription model returned an empty response.");
            }
            return objectMapper.readTree(content);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Prescription suggestion was interrupted.", exception);
        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Prescription assistant is unavailable. Start Ollama and install the configured model.",
                    exception);
        }
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static List<String> stringList(Object value) {
        if (!(value instanceof List<?> values)) {
            return List.of();
        }
        return values.stream().map(PrescriptionSuggestionService::text).filter(item -> !item.isBlank()).toList();
    }
}