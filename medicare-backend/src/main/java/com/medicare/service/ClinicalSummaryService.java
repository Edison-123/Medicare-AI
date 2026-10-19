package com.medicare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ClinicalSummaryService {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final List<String> TEXT_FIELDS = List.of(
            "chiefComplaint", "symptoms", "exam", "diagnosis", "diagnosisStatus", "medications", "investigations",
            "plan", "followUp");
    private static final List<String> VITAL_FIELDS = List.of("bp", "hr", "temp", "spo2", "recordedAt");
    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}]+");
    private static final Pattern DOCTOR_LINE = Pattern.compile(
            "(?im)^\\s*(?:\\[)?(?:doctor|clinician|physician)(?:\\])?\\s*[:\\-]\\s*(.+?)\\s*$");
    private static final Pattern OTHER_SPEAKER = Pattern.compile(
            "(?i)\\s+(?:\\[)?(?:patient|companion|speaker\\s*\\d+)(?:\\])?\\s*:");
    private static final Pattern BP_VALUE = Pattern.compile(
            "(?i)(?:blood\\s*pressure|\\bbp\\b)\\s*(?:(?:is|of|at)\\s*)?[:]?\\s*(\\d{2,3}\\s*(?:/|over)\\s*\\d{2,3})(?:\\s*mm\\s*hg)?");
    private static final Pattern HR_VALUE = Pattern.compile(
            "(?i)(?:heart\\s*rate|pulse|\\bhr\\b)\\s*(?:(?:is|of|at)\\s*)?[:]?\\s*(\\d{2,3}(?:\\s*(?:bpm|beats?\\s+per\\s+minute))?)");
    private static final Pattern TEMP_VALUE = Pattern.compile(
            "(?i)(?:temperature|\\btemp\\b)\\s*(?:(?:is|of|at)\\s*)?[:]?\\s*(\\d{2}(?:\\s*\\.\\s*\\d+)?(?:\\s*(?:°\\s*)?[cf])?)");
    private static final Pattern SPO2_VALUE = Pattern.compile(
            "(?i)(?:spo2|oxygen\\s+saturation)\\s*(?:(?:is|of|at)\\s*)?[:]?\\s*(\\d{1,3}\\s*%?)");
    private static final Pattern RECORDED_TIME = Pattern.compile(
            "(?i)(?:recorded|measured)(?:\\s+at)?\\s+(\\d{1,2}:\\d{2}\\s*(?:am|pm)?)");
    private static final Pattern CHIEF_COMPLAINT = Pattern.compile(
            "(?i)(?:chief complaint(?:\\s+is|\\s*:)?\\s*|presents? with\\s+|reports?\\s+(?:a\\s+|an\\s+|the\\s+)?|(?:i|patient)\\s+(?:have|has)\\s+had\\s+(?:a\\s+|an\\s+|the\\s+)?)(?<value>(?:(?:dry|productive|persistent|severe|mild)\\s+)?(?:cough|sore throat|headache|chest pain|abdominal pain|fever|nausea)(?:\\s+(?:that\\s+)?(?:began|started|lasting|for|since)\\s+[^.!?;\\n]*?)?)(?=\\s+(?:no\\s+(?:chest pain|shortness of breath|sob|fever|nausea)|your\\s+temperature|my\\s+assessment|start\\s+[\\p{L}-]+\\s+\\d)|[.!?;\\n]|$)");
    private static final Pattern HANDWRITTEN_COMPLAINT = Pattern.compile(
            "(?i)\\b(?:(?:dry|productive|persistent|severe|mild)\\s+)?(?:cough|sore throat|headache|chest pain|abdominal pain|fever|nausea)\\s+\\d+\\s+(?:days?|weeks?|hours?)\\b");
    private static final Pattern SYMPTOM_CUES = Pattern.compile(
            "(?i)\\b(?:non[- ]?productive|began|started|patient reports|patient denies|denies|shortness of breath|chest pain|fever|sore throat|dry cough|nausea|headache|hives)\\b|\\bno\\s+(?:chest pain|shortness of breath|sob|fever|nausea)\\b");
    private static final Pattern EXAM_CUES = Pattern.compile(
            "(?i)\\b(?:examination shows|on examination|breath sounds|wheeze|pharyngeal erythema|lungs are clear)\\b");
    private static final Pattern DIAGNOSIS = Pattern.compile(
            "(?i)(?:working\\s+)?(?:assessment|diagnosis|impression)\\s*(?:is|:)?\\s*(?<value>[^.!?;\\n]*?)(?=\\s+(?:follow[ -]?up|medications?|investigations?|treatment plan|plan|provisional|confirmed)\\b|[.!?;\\n]|$)");
    private static final Pattern DIAGNOSIS_STATUS = Pattern.compile(
            "(?i)\\b(?:diagnosis status\\s*(?:is|:)?\\s*(?<status>provisional|confirmed)|(?<kind>provisional|confirmed) diagnosis|(?:assessment|diagnosis|impression)\\s*(?:is|:)?[^.!?;\\n]{0,120}\\b(?<endStatus>provisional|confirmed))\\b");
    private static final Pattern MEDICATION_CUES = Pattern.compile(
            "(?i)\\b(?:medications?|prescribed|prescription|continue the current|continue current|continue the existing|continue existing|amlodipine|(?:start|begin|take)\\s+(?:the\\s+)?[\\p{L}-]+\\s+\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|ml|units?))\\b");
    private static final Pattern INVESTIGATION = Pattern.compile(
            "(?i)(?:no\\s+)?(?:complete blood count|\\bcbc\\b|imaging(?:\\s+test)?|(?:lab|laboratory) test|test)\\b[^.!?;\\n]{0,80}?\\b(?:ordered|recommended|discussed)\\b(?:\\s+today)?");
    private static final Pattern LABELED_PLAN = Pattern.compile(
            "(?i)(?:the\\s+)?(?:treatment\\s+)?plan\\s*(?:is|:)\\s*(?<value>[^.!?;\\n]+)");
    private static final Pattern PLAN_ACTION = Pattern.compile(
            "(?i)\\b(?:rest(?:\\s+(?:and\\s+)?(?:oral\\s+)?fluids?)?|drink(?:ing)?\\s+(?:oral\\s+)?fluids?|oral fluids|hydration|monitor(?:ing)? symptoms(?: at home)?)\\b");
    private static final Pattern FOLLOW_UP = Pattern.compile(
            "(?i)\\b(?:follow[ -]?up|return precautions?|seek urgent assessment|seek urgent care|seek emergency care)\\b[^.!?;\\n]*");
    private static final Pattern SENTENCE_BOUNDARY = Pattern.compile(
            "(?i)(?<=[.!?])\\s+|\\R+|\\s+(?=(?:i\\s+(?:have|had|got)\\b|i['’]ve\\b|no\\s+(?:chest pain|shortness of breath|sob|fever|nausea)\\b|your\\s+temperature\\b|(?:temperature|oxygen saturation|spo2)\\b|lungs?\\s+(?:are|sound|sounds)\\b|my\\s+assessment\\b|(?:assessment|diagnosis|impression)\\s+(?:is|:)\\b|(?:start|begin|take)\\s+[\\p{L}-]+\\s+\\d|drink\\s+fluids\\b|follow[ -]?up\\b|seek\\s+urgent\\b))");

    private static final String SYSTEM_PROMPT = """
            You extract a draft clinical summary. You do not diagnose, recommend care, or fill gaps.
            Use the supplied doctor-authored consultation fields, handwriting, notes, and audio transcript.
            The audio transcript may contain multiple speakers and is unattributed. Never infer who spoke or
            present transcript content as doctor-authored. Extract only explicit facts, do not diagnose or
            recommend care, and leave ambiguous or contradictory content empty. Transcript-derived values
            remain unverified drafts for clinician review.
            Preserve explicit negations. Never invent or calculate medication names, doses, units, route,
            frequency, duration, test status, vital values, diagnosis certainty, or follow-up timing.
            Return only JSON with exactly these keys in fields: chiefComplaint, symptoms, vitals, exam,
            diagnosis, diagnosisStatus, medications, investigations, plan, followUp. diagnosisStatus may only be
            "provisional" or "confirmed" when that status is explicitly stated. vitals must contain bp, hr, temp, spo2,
            recordedAt as strings. evidence must use the same keys; each text-field evidence value is an
            object with the source key and an exact short quote copied verbatim from that source. Use
            audio_transcript for transcript evidence and never assign it a speaker. For vitals,
            evidence.vitals must contain an object for each populated vital key, each with source and exact quote.
            Only populate a field when its quote exactly supports the extracted value. Use empty strings and
            empty evidence objects for anything unsupported. Keep summaries concise and do not add prose outside JSON.
            """;

    private final Environment environment;

    public ClinicalSummaryService(Environment environment) {
        this.environment = environment;
    }

    public Map<String, Object> summarize(Map<String, Object> requestBody) {
        Map<?, ?> consultation = asMap(requestBody.get("consultation"));
        Map<?, ?> consultationVitals = asMap(consultation.get("vitals"));
        String transcript = text(requestBody.get("transcript"));
        String doctorAudio = extractDoctorStatements(transcript);
        String handwritten = text(requestBody.get("handwritten"));
        String notes = text(requestBody.get("notes"));

        Map<String, String> trustedSources = new LinkedHashMap<>();
        trustedSources.put("doctor_audio", doctorAudio);
        trustedSources.put("doctor_notes", notes);
        trustedSources.put("handwritten", handwritten);
        trustedSources.put("audio_transcript", transcript);
        if (consultation.isEmpty() && trustedSources.values().stream().noneMatch(ClinicalSummaryService::hasText)) {
            throw new IllegalArgumentException(
                    "Provide consultation fields, writing, notes, or an audio transcript.");
        }

        JsonNode generated = requestModel(consultation, trustedSources);
        JsonNode generatedFields = generated.path("fields").isObject() ? generated.path("fields") : generated;
        JsonNode generatedEvidence = generated.path("evidence");
        ObjectNode fields = OBJECT_MAPPER.createObjectNode();
        ObjectNode evidence = OBJECT_MAPPER.createObjectNode();

        for (String field : TEXT_FIELDS) {
            String directValue = text(consultation.get(field));
            if (hasText(directValue)) {
                fields.put(field, directValue);
                evidence.set(field, directEvidence(directValue));
            } else {
                VerifiedValue verified = extractExplicitField(field, trustedSources);
                if (!hasText(verified.value())) {
                    verified = verify(field, generatedFields.path(field), generatedEvidence.path(field),
                            trustedSources);
                }
                fields.put(field, verified.value());
                evidence.set(field, verified.evidence());
            }
        }

        ObjectNode vitals = OBJECT_MAPPER.createObjectNode();
        ObjectNode vitalEvidence = OBJECT_MAPPER.createObjectNode();
        StringBuilder vitalQuotes = new StringBuilder();
        String vitalSource = null;
        String vitalSpeaker = null;
        for (String vital : VITAL_FIELDS) {
            String directValue = text(consultationVitals.get(vital));
            VerifiedValue verified;
            if (hasText(directValue)) {
                vitals.put(vital, directValue);
                verified = new VerifiedValue(directValue, directEvidence(directValue));
            } else {
                verified = extractVital(vital, trustedSources);
                if (!hasText(verified.value())) {
                    JsonNode generatedVitals = generatedFields.path("vitals");
                    verified = generatedVitals.isObject()
                            ? verify(vital, generatedVitals.path(vital), generatedEvidence.path("vitals").path(vital),
                                    trustedSources)
                            : new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
                }
                vitals.put(vital, verified.value());
            }
            vitalEvidence.set(vital, verified.evidence());
            String quote = verified.evidence().path("quote").asText("");
            if (hasText(quote)) {
                if (!vitalQuotes.isEmpty()) {
                    vitalQuotes.append("; ");
                }
                vitalQuotes.append(quote);
                String source = verified.evidence().path("source").asText("");
                vitalSource = vitalSource == null || vitalSource.equals(source) ? source : "multiple sources";
                String speaker = verified.evidence().path("speaker").asText("");
                vitalSpeaker = vitalSpeaker == null || vitalSpeaker.equals(speaker) ? speaker : "mixed";
            }
        }
        if (!vitalQuotes.isEmpty()) {
            vitalEvidence.put("quote", vitalQuotes.toString())
                    .put("source", vitalSource)
                    .put("speaker", vitalSpeaker);
        }
        fields.set("vitals", vitals);
        evidence.set("vitals", vitalEvidence);

        String model = environment.getProperty("medicare.ai.summary.ollama.model", "qwen2.5:1.5b");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fields", fields);
        result.put("evidence", evidence);
        result.put("provider", model);
        result.put("confidence", null);
        return result;
    }

    static String extractDoctorStatements(String transcript) {
        Matcher matcher = DOCTOR_LINE.matcher(transcript == null ? "" : transcript);
        StringBuilder statements = new StringBuilder();
        while (matcher.find()) {
            String statement = matcher.group(1).trim();
            Matcher otherSpeaker = OTHER_SPEAKER.matcher(statement);
            if (otherSpeaker.find()) {
                statement = statement.substring(0, otherSpeaker.start()).trim();
            }
            if (statement.isEmpty()) {
                continue;
            }
            if (!statements.isEmpty()) {
                statements.append('\n');
            }
            statements.append(statement);
        }
        return statements.toString();
    }

    private JsonNode requestModel(Map<?, ?> consultation, Map<String, String> trustedSources) {
        String url = environment.getProperty("medicare.ai.summary.ollama.url", "http://localhost:11434/api/chat");
        String model = environment.getProperty("medicare.ai.summary.ollama.model", "qwen2.5:1.5b");
        try {
            ObjectNode sources = OBJECT_MAPPER.createObjectNode();
            sources.set("consultation", OBJECT_MAPPER.valueToTree(consultation));
            trustedSources.forEach(sources::put);

            ArrayNode messages = OBJECT_MAPPER.createArrayNode();
            messages.addObject().put("role", "system").put("content", SYSTEM_PROMPT);
            messages.addObject().put("role", "user").put("content", OBJECT_MAPPER.writeValueAsString(sources));

            ObjectNode options = OBJECT_MAPPER.createObjectNode()
                    .put("temperature", 0)
                    .put("num_ctx", 4096)
                    .put("num_predict", 1200);
            ObjectNode body = OBJECT_MAPPER.createObjectNode()
                    .put("model", model)
                    .put("stream", false)
                    .put("format", "json")
                    .put("keep_alive", "2m");
            body.set("messages", messages);
            body.set("options", options);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMinutes(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(OBJECT_MAPPER.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Local clinical summary model returned HTTP " + response.statusCode() + ".");
            }
            JsonNode envelope = OBJECT_MAPPER.readTree(response.body());
            String content = envelope.path("message").path("content").asText("");
            if (content.isBlank()) {
                throw new IllegalStateException("Local clinical summary model returned an empty response.");
            }
            return OBJECT_MAPPER.readTree(content);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Clinical summary generation was interrupted.", exception);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Local clinical summary model is unavailable. Start Ollama and install the configured model.",
                    exception);
        }
    }

    private static VerifiedValue verify(String field, JsonNode candidate, JsonNode candidateEvidence,
            Map<String, String> sources) {
        String value = candidate.isTextual() ? candidate.asText().trim() : "";
        String sourceName = candidateEvidence.path("source").asText("");
        String quote = candidateEvidence.path("quote").asText("").trim();
        String sourceText = sources.getOrDefault(sourceName, "");
        if ("exam".equals(field) && isVitalStatement(value)) {
            return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
        }

        if (hasText(quote)) {
            String matchedQuote = findQuote(sourceText, quote);
            if (matchedQuote != null && !hasText(value)) {
                value = matchedQuote;
            }
            if (matchedQuote != null && hasText(value) && containsEvidence(matchedQuote, value)
                    && isValidFieldValue(field, value, matchedQuote)) {
                return verified(value, sourceName, matchedQuote);
            }
        }

        if (hasText(value)) {
            for (Map.Entry<String, String> source : sources.entrySet()) {
                if ("audio_transcript".equals(source.getKey())) {
                    continue;
                }
                String matchedQuote = findQuote(source.getValue(), value);
                if (matchedQuote != null && isValidFieldValue(field, value, matchedQuote)) {
                    return verified(matchedQuote, source.getKey(), matchedQuote);
                }
            }
        }
        return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
    }

    private static VerifiedValue extractExplicitField(String field, Map<String, String> sources) {
        return switch (field) {
            case "chiefComplaint" -> extractChiefComplaint(sources);
            case "symptoms" -> extractSentences(SYMPTOM_CUES, sources);
            case "exam" -> extractSentences(EXAM_CUES, sources);
            case "diagnosis" -> extractPattern(DIAGNOSIS, "value", sources);
            case "diagnosisStatus" -> extractDiagnosisStatus(sources);
            case "medications" -> extractSentences(MEDICATION_CUES, sources);
            case "investigations" -> extractPattern(INVESTIGATION, 0, sources);
            case "plan" -> extractPlan(sources);
            case "followUp" -> extractSentences(FOLLOW_UP, sources);
            default -> new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
        };
    }

    private static VerifiedValue extractDiagnosisStatus(Map<String, String> sources) {
        for (Map.Entry<String, String> source : sources.entrySet()) {
            Matcher matcher = DIAGNOSIS_STATUS.matcher(source.getValue());
            if (matcher.find()) {
                String value = matcher.group("status") != null ? matcher.group("status")
                        : matcher.group("kind") != null ? matcher.group("kind") : matcher.group("endStatus");
                return verified(value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1),
                        source.getKey(), matcher.group());
            }
        }
        return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
    }

    private static VerifiedValue extractChiefComplaint(Map<String, String> sources) {
        VerifiedValue labeled = extractPattern(CHIEF_COMPLAINT, "value", sources);
        if (hasText(labeled.value())) {
            return labeled;
        }
        String handwritten = sources.getOrDefault("handwritten", "");
        Matcher matcher = HANDWRITTEN_COMPLAINT.matcher(handwritten);
        if (matcher.find()) {
            String match = matcher.group();
            return verified(match, "handwritten", match);
        }
        return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
    }

    private static VerifiedValue extractSentences(Pattern cue, Map<String, String> sources) {
        VerifiedValue best = new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
        int bestCount = 0;
        int bestPriority = -1;
        for (Map.Entry<String, String> source : sources.entrySet()) {
            String text = source.getValue();
            List<String> selected = new java.util.ArrayList<>();
            int firstStart = -1;
            int lastEnd = -1;
            for (String sentence : SENTENCE_BOUNDARY.split(text)) {
                String trimmed = sentence.trim();
                if (!hasText(trimmed) || !cue.matcher(trimmed).find()) {
                    continue;
                }
                if (cue == SYMPTOM_CUES && (EXAM_CUES.matcher(trimmed).find()
                        || DIAGNOSIS.matcher(trimmed).find()
                        || MEDICATION_CUES.matcher(trimmed).find()
                        || INVESTIGATION.matcher(trimmed).find()
                        || FOLLOW_UP.matcher(trimmed).find())) {
                    continue;
                }
                int start = text.indexOf(trimmed, Math.max(0, lastEnd));
                if (start < 0) {
                    continue;
                }
                if (firstStart < 0) {
                    firstStart = start;
                }
                lastEnd = start + trimmed.length();
                if (selected.stream().noneMatch(existing -> existing.equalsIgnoreCase(trimmed))) {
                    selected.add(trimmed);
                }
            }
            if (!selected.isEmpty() && firstStart >= 0 && lastEnd > firstStart) {
                int priority = sourcePriority(source.getKey());
                if (selected.size() > bestCount || selected.size() == bestCount && priority > bestPriority) {
                    String value = String.join(" ", selected);
                    String quote = text.substring(firstStart, lastEnd).trim();
                    best = verified(value, source.getKey(), quote);
                    bestCount = selected.size();
                    bestPriority = priority;
                }
            }
        }
        return best;
    }

    private static int sourcePriority(String source) {
        return switch (source) {
            case "doctor_audio" -> 4;
            case "doctor_notes" -> 3;
            case "audio_transcript" -> 2;
            case "handwritten" -> 1;
            default -> 0;
        };
    }

    private static VerifiedValue extractPlan(Map<String, String> sources) {
        VerifiedValue labeled = extractPattern(LABELED_PLAN, "value", sources);
        return hasText(labeled.value()) ? labeled : extractPattern(PLAN_ACTION, 0, sources);
    }

    private static VerifiedValue extractPattern(Pattern pattern, int group, Map<String, String> sources) {
        for (Map.Entry<String, String> source : sources.entrySet()) {
            Matcher matcher = pattern.matcher(source.getValue());
            if (matcher.find()) {
                String value = matcher.group(group).trim();
                String quote = matcher.group().trim();
                if (hasText(value) && hasText(quote)) {
                    return verified(value, source.getKey(), quote);
                }
            }
        }
        return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
    }

    private static VerifiedValue extractPattern(Pattern pattern, String group, Map<String, String> sources) {
        for (Map.Entry<String, String> source : sources.entrySet()) {
            Matcher matcher = pattern.matcher(source.getValue());
            if (matcher.find()) {
                String value = matcher.group(group).trim();
                String quote = matcher.group().trim();
                if (hasText(value) && hasText(quote)) {
                    return verified(value, source.getKey(), quote);
                }
            }
        }
        return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
    }

    private static VerifiedValue extractVital(String vital, Map<String, String> sources) {
        Pattern pattern = switch (vital) {
            case "bp" -> BP_VALUE;
            case "hr" -> HR_VALUE;
            case "temp" -> TEMP_VALUE;
            case "spo2" -> SPO2_VALUE;
            case "recordedAt" -> RECORDED_TIME;
            default -> null;
        };
        if (pattern == null) {
            return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
        }
        for (Map.Entry<String, String> source : sources.entrySet()) {
            Matcher matcher = pattern.matcher(source.getValue());
            if (matcher.find()) {
                String quote = matcher.group();
                String value = matcher.group(1).trim();
                if ("temp".equals(vital)) {
                    value = value.replaceAll("\\s*\\.\\s*", ".");
                }
                return verified(value, source.getKey(), quote);
            }
        }
        return new VerifiedValue("", OBJECT_MAPPER.createObjectNode());
    }

    private static boolean isVitalStatement(String value) {
        return value != null && Pattern
                .compile("(?i)\\b(?:blood\\s*pressure|heart\\s*rate|pulse|spo2|oxygen\\s+saturation|temperature)\\b")
                .matcher(value).find();
    }

    private static boolean isValidFieldValue(String field, String value, String quote) {
        if (!VITAL_FIELDS.contains(field)) {
            return true;
        }
        Pattern pattern = switch (field) {
            case "bp" -> BP_VALUE;
            case "hr" -> HR_VALUE;
            case "temp" -> TEMP_VALUE;
            case "spo2" -> SPO2_VALUE;
            case "recordedAt" -> RECORDED_TIME;
            default -> null;
        };
        if (pattern == null) {
            return false;
        }
        Matcher matcher = pattern.matcher(quote);
        return matcher.find() && containsEvidence(matcher.group(1), value);
    }

    private static VerifiedValue verified(String value, String source, String quote) {
        ObjectNode verifiedEvidence = OBJECT_MAPPER.createObjectNode()
                .put("source", source)
                .put("quote", quote)
                .put("speaker", "audio_transcript".equals(source) ? "unattributed" : "doctor");
        return new VerifiedValue(value, verifiedEvidence);
    }

    private static ObjectNode directEvidence(String value) {
        return OBJECT_MAPPER.createObjectNode()
                .put("source", "consultation")
                .put("quote", value)
                .put("speaker", "doctor");
    }

    private static boolean containsEvidence(String source, String quote) {
        return findQuote(source, quote) != null;
    }

    private static String findQuote(String source, String phrase) {
        if (!hasText(source) || !hasText(phrase)) {
            return null;
        }
        List<String> sourceWords = new java.util.ArrayList<>();
        List<Integer> starts = new java.util.ArrayList<>();
        List<Integer> ends = new java.util.ArrayList<>();
        Matcher sourceMatcher = WORD.matcher(source);
        while (sourceMatcher.find()) {
            sourceWords.add(sourceMatcher.group().toLowerCase(Locale.ROOT));
            starts.add(sourceMatcher.start());
            ends.add(sourceMatcher.end());
        }
        List<String> phraseWords = new java.util.ArrayList<>();
        Matcher phraseMatcher = WORD.matcher(phrase);
        while (phraseMatcher.find()) {
            phraseWords.add(phraseMatcher.group().toLowerCase(Locale.ROOT));
        }
        if (phraseWords.isEmpty() || (phraseWords.size() == 1 && phraseWords.get(0).length() < 4)) {
            return null;
        }
        for (int start = 0; start <= sourceWords.size() - phraseWords.size(); start++) {
            if (sourceWords.subList(start, start + phraseWords.size()).equals(phraseWords)) {
                return source.substring(starts.get(start), ends.get(start + phraseWords.size() - 1));
            }
        }
        return null;
    }

    private static Map<?, ?> asMap(Object value) {
        return value instanceof Map<?, ?> map ? map : Map.of();
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record VerifiedValue(String value, ObjectNode evidence) {
    }
}