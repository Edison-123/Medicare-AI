package com.medicare.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medicare.entity.UserSettings;
import com.medicare.repository.UserSettingsRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class UserSettingsService {

    private final UserSettingsRepository repository;
    private final ObjectMapper objectMapper;

    public UserSettingsService(UserSettingsRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> getOrCreate(Long userId, String roleKind, Map<String, Object> defaults) {
        UserSettings row = repository.findByUserIdAndRoleKind(userId, roleKind).orElseGet(() -> {
            UserSettings created = new UserSettings();
            created.setUserId(userId);
            created.setRoleKind(roleKind);
            created.setSettingsJson(write(defaults));
            return repository.save(created);
        });
        return read(row.getSettingsJson());
    }

    public Object getSetting(Long userId, String roleKind, String section, String key) {
        UserSettings row = repository.findByUserIdAndRoleKind(userId, roleKind).orElse(null);
        if (row == null) {
            return null;
        }
        Object values = read(row.getSettingsJson()).get(section);
        return values instanceof Map<?, ?> settings ? settings.get(key) : null;
    }

    public Map<String, Object> replace(Long userId, String roleKind, Map<String, Object> updated,
            Map<String, Object> defaults) {
        UserSettings row = repository.findByUserIdAndRoleKind(userId, roleKind).orElseGet(() -> {
            UserSettings created = new UserSettings();
            created.setUserId(userId);
            created.setRoleKind(roleKind);
            return created;
        });
        Map<String, Object> safe = updated == null ? new HashMap<>(defaults) : new HashMap<>(updated);
        row.setSettingsJson(write(safe));
        repository.save(row);
        return read(row.getSettingsJson());
    }

    private String write(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to persist user settings", e);
        }
    }

    private Map<String, Object> read(String value) {
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
