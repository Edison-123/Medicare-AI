package com.medicare.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.env.MockEnvironment;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiServicesLifecycleTest {

    @TempDir
    Path serviceRoot;

    @Test
    void createsLifecycleBeanInSpringWithoutStartingExternalServices() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(
                    new MapPropertySource("test", java.util.Map.of("medicare.ai.lifecycle.enabled", false)));
            context.register(AiServicesLifecycle.class);
            context.refresh();

            assertTrue(context.getBean(AiServicesLifecycle.class).isRunning());
        }
    }

    @Test
    void startsOnlyMissingLocalServicesAndStopsOnlyProcessesItOwns() throws IOException {
        createServiceDirectories();
        List<ProcessBuilder> builders = new ArrayList<>();
        List<StubProcess> processes = new ArrayList<>();
        AiServicesLifecycle lifecycle = lifecycle(new MockEnvironment(), builders, processes,
                new StubProbe(Set.of(), Set.of()));

        lifecycle.start();

        assertEquals(3, builders.size());
        assertEquals(3, lifecycle.ownedProcessCount());
        assertTrue(builders.stream().anyMatch(builder -> builder.command().contains("uvicorn")
                && builder.command().contains("8082")));
        assertTrue(builders.stream().anyMatch(builder -> builder.command().contains("uvicorn")
                && builder.command().contains("8081")));
        assertTrue(builders.stream().anyMatch(builder -> builder.command().contains("serve")));
        assertTrue(builders.stream().filter(builder -> builder.command().contains("uvicorn"))
                .allMatch(builder -> "1".equals(builder.environment().get("HF_HUB_OFFLINE"))));

        lifecycle.stop();

        assertEquals(0, lifecycle.ownedProcessCount());
        assertTrue(processes.stream().allMatch(process -> process.destroyed));
    }

    @Test
    void leavesHealthyServicesAndPortsOwnedByOthersAlone() throws IOException {
        createServiceDirectories();
        List<ProcessBuilder> builders = new ArrayList<>();
        List<StubProcess> processes = new ArrayList<>();
        AiServicesLifecycle lifecycle = lifecycle(new MockEnvironment(), builders, processes,
                new StubProbe(Set.of(11434, 8082), Set.of(8081)));

        lifecycle.start();
        lifecycle.stop();

        assertTrue(builders.isEmpty());
        assertTrue(processes.isEmpty());
    }

    @Test
    void skipsRemoteEndpointsAndCanBeDisabled() throws IOException {
        createServiceDirectories();
        MockEnvironment remote = new MockEnvironment()
                .withProperty("medicare.ai.summary.ollama.url", "https://ollama.example/api/chat")
                .withProperty("medicare.ai.transcription.whisper.url", "https://whisper.example/transcribe")
                .withProperty("medicare.ai.ocr.trocr.url", "https://ocr.example/ocr");
        List<ProcessBuilder> builders = new ArrayList<>();
        List<StubProcess> processes = new ArrayList<>();
        AiServicesLifecycle remoteLifecycle = lifecycle(remote, builders, processes,
                new StubProbe(Set.of(), Set.of()));
        remoteLifecycle.start();
        remoteLifecycle.stop();
        assertTrue(builders.isEmpty());

        MockEnvironment disabled = new MockEnvironment()
                .withProperty("medicare.ai.lifecycle.enabled", "false");
        AiServicesLifecycle disabledLifecycle = lifecycle(disabled, builders, processes,
                new StubProbe(Set.of(), Set.of()));
        disabledLifecycle.start();
        disabledLifecycle.stop();
        assertTrue(builders.isEmpty());
    }

    private AiServicesLifecycle lifecycle(MockEnvironment environment, List<ProcessBuilder> builders,
            List<StubProcess> processes, AiServicesLifecycle.EndpointProbe probe) {
        setDefault(environment, "medicare.ai.lifecycle.python", "python-test");
        setDefault(environment, "medicare.ai.lifecycle.ollama-command", "ollama-test");
        setDefault(environment, "medicare.ai.lifecycle.service-root", serviceRoot.toString());
        setDefault(environment, "medicare.ai.transcription.whisper.url", "http://127.0.0.1:8082/transcribe");
        setDefault(environment, "medicare.ai.ocr.trocr.url", "http://127.0.0.1:8081/ocr");
        setDefault(environment, "medicare.ai.summary.ollama.url", "http://127.0.0.1:11434/api/chat");
        return new AiServicesLifecycle(environment, builder -> {
            builders.add(builder);
            StubProcess process = new StubProcess();
            processes.add(process);
            return process;
        }, probe, serviceRoot);
    }

    private static void setDefault(MockEnvironment environment, String key, String value) {
        if (!environment.containsProperty(key)) {
            environment.withProperty(key, value);
        }
    }

    private void createServiceDirectories() throws IOException {
        for (String directory : List.of("speech-service", "ocr-service")) {
            Path service = Files.createDirectories(serviceRoot.resolve(directory));
            Files.createFile(service.resolve("app.py"));
        }
    }

    private record StubProbe(Set<Integer> healthyPorts, Set<Integer> listeningPorts)
            implements AiServicesLifecycle.EndpointProbe {
        @Override
        public boolean isHealthy(URI uri) {
            return healthyPorts.contains(uri.getPort());
        }

        @Override
        public boolean isListening(URI uri) {
            return listeningPorts.contains(uri.getPort());
        }
    }

    private static final class StubProcess extends Process {
        private boolean alive = true;
        private boolean destroyed;

        @Override
        public OutputStream getOutputStream() {
            return new ByteArrayOutputStream();
        }

        @Override
        public ByteArrayInputStream getInputStream() {
            return new ByteArrayInputStream(new byte[0]);
        }

        @Override
        public ByteArrayInputStream getErrorStream() {
            return new ByteArrayInputStream(new byte[0]);
        }

        @Override
        public int waitFor() {
            alive = false;
            return 0;
        }

        @Override
        public boolean waitFor(long timeout, TimeUnit unit) {
            return !alive;
        }

        @Override
        public int exitValue() {
            if (alive) {
                throw new IllegalThreadStateException("process is still running");
            }
            return 0;
        }

        @Override
        public void destroy() {
            destroyed = true;
            alive = false;
        }

        @Override
        public Process destroyForcibly() {
            destroyed = true;
            alive = false;
            return this;
        }

        @Override
        public boolean isAlive() {
            return alive;
        }

        @Override
        public long pid() {
            return 123L;
        }
    }
}