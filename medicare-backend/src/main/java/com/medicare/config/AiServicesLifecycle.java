package com.medicare.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.SmartLifecycle;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;

@Component
public class AiServicesLifecycle implements SmartLifecycle {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiServicesLifecycle.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(1))
            .build();

    @FunctionalInterface
    interface ProcessLauncher {
        Process launch(ProcessBuilder builder) throws IOException;
    }

    interface EndpointProbe {
        boolean isHealthy(URI uri);

        boolean isListening(URI uri);
    }

    private final Environment environment;
    private final ProcessLauncher processLauncher;
    private final EndpointProbe endpointProbe;
    private final Path serviceRoot;
    private final List<Process> ownedProcesses = new CopyOnWriteArrayList<>();
    private final List<Thread> readinessMonitors = new CopyOnWriteArrayList<>();
    private volatile boolean running;

    @Autowired
    public AiServicesLifecycle(Environment environment) {
        this(environment, ProcessBuilder::start, new HttpEndpointProbe(), resolveServiceRoot(environment));
    }

    AiServicesLifecycle(Environment environment, ProcessLauncher processLauncher, EndpointProbe endpointProbe,
            Path serviceRoot) {
        this.environment = environment;
        this.processLauncher = processLauncher;
        this.endpointProbe = endpointProbe;
        this.serviceRoot = serviceRoot.toAbsolutePath().normalize();
    }

    @Override
    public synchronized void start() {
        if (running) {
            return;
        }
        if (!environment.getProperty("medicare.ai.lifecycle.enabled", Boolean.class, true)) {
            LOGGER.info("Automatic AI service startup is disabled.");
            running = true;
            return;
        }

        startOllama();
        startPythonService("Whisper", "medicare.ai.transcription.whisper.url",
                "http://localhost:8082/transcribe", "/health", "speech-service", 8082);
        startPythonService("TrOCR", "medicare.ai.ocr.trocr.url", "http://localhost:8081/ocr",
                "/health", "ocr-service", 8081);
        running = true;
    }

    private void startOllama() {
        String serviceUrl = environment.getProperty("medicare.ai.summary.ollama.url",
                "http://localhost:11434/api/chat");
        String executable = environment.getProperty("medicare.ai.lifecycle.ollama-command", "ollama");
        startLocalService("Ollama", serviceUrl, "/api/tags", serviceRoot,
                List.of(executable, "serve"), false, 11434);
    }

    private void startPythonService(String name, String urlProperty, String defaultUrl, String healthPath,
            String directoryName, int defaultPort) {
        String serviceUrl = environment.getProperty(urlProperty, defaultUrl);
        URI endpoint = parseUri(name, serviceUrl);
        if (endpoint == null) {
            return;
        }
        int port = endpoint.getPort() < 0 ? defaultPort : endpoint.getPort();
        Path workingDirectory = serviceRoot.resolve(directoryName);
        Path appFile = workingDirectory.resolve("app.py");
        if (!Files.isRegularFile(appFile)) {
            LOGGER.warn("Cannot auto-start {}: service entry point not found at {}.", name, appFile);
            return;
        }

        String python = resolvePython();
        List<String> command = List.of(python, "-m", "uvicorn", "app:app", "--host", "127.0.0.1",
                "--port", Integer.toString(port));
        startLocalService(name, serviceUrl, healthPath, workingDirectory, command, true, port);
    }

    private void startLocalService(String name, String serviceUrl, String healthPath, Path workingDirectory,
            List<String> command, boolean pythonService, int defaultPort) {
        URI endpoint = parseUri(name, serviceUrl);
        if (endpoint == null) {
            return;
        }
        if (!isLoopback(endpoint.getHost())) {
            LOGGER.info("Not auto-starting remote {} endpoint {}.", name, endpoint.getHost());
            return;
        }

        int port = endpoint.getPort() >= 0 ? endpoint.getPort() : defaultPort;
        URI healthUri = withHostAndPort(endpoint, port, healthPath);
        if (healthUri == null) {
            LOGGER.warn("Cannot auto-start {}: invalid health endpoint for {}.", name, serviceUrl);
            return;
        }
        if (endpointProbe.isHealthy(healthUri)) {
            LOGGER.info("{} is already healthy at {}.", name, healthUri);
            return;
        }
        if (endpointProbe.isListening(endpoint)) {
            LOGGER.warn("{} port is already in use but its health check failed; not starting a duplicate.", name);
            return;
        }

        try {
            ProcessBuilder builder = new ProcessBuilder(command)
                    .directory(workingDirectory.toFile())
                    .redirectOutput(ProcessBuilder.Redirect.INHERIT)
                    .redirectError(ProcessBuilder.Redirect.INHERIT);
            if (pythonService) {
                if (environment.getProperty("medicare.ai.lifecycle.hf-offline", Boolean.class, true)) {
                    builder.environment().put("HF_HUB_OFFLINE", "1");
                } else {
                    builder.environment().remove("HF_HUB_OFFLINE");
                }
            }
            Process process = processLauncher.launch(builder);
            ownedProcesses.add(process);
            LOGGER.info("Started {} process (pid {}) for {}.", name, process.pid(), healthUri);
            monitorReadiness(name, healthUri, process);
        } catch (IOException | RuntimeException exception) {
            LOGGER.warn("Could not start {}: {}", name, exception.getMessage());
        }
    }

    private void monitorReadiness(String name, URI healthUri, Process process) {
        long timeoutSeconds = environment.getProperty("medicare.ai.lifecycle.readiness-timeout-seconds",
                Long.class, 300L);
        Thread monitor = new Thread(() -> {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
            while (!Thread.currentThread().isInterrupted() && process.isAlive()) {
                if (endpointProbe.isHealthy(healthUri)) {
                    LOGGER.info("{} is ready at {}.", name, healthUri);
                    return;
                }
                if (System.nanoTime() >= deadline) {
                    LOGGER.warn("{} did not become healthy within {} seconds.", name, timeoutSeconds);
                    return;
                }
                try {
                    Thread.sleep(1000L);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            }
            if (!Thread.currentThread().isInterrupted()) {
                LOGGER.error("{} process exited before becoming healthy (exit code {}).", name, process.exitValue());
            }
        }, "medicare-ai-readiness-" + name.toLowerCase(Locale.ROOT));
        monitor.setDaemon(true);
        readinessMonitors.add(monitor);
        monitor.start();
    }

    private String resolvePython() {
        String configured = environment.getProperty("medicare.ai.lifecycle.python", "").trim();
        if (!configured.isEmpty()) {
            Path path = Path.of(configured);
            return (path.isAbsolute() ? path : serviceRoot.resolve(path)).normalize().toString();
        }

        boolean windows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
        Path virtualEnvPython = serviceRoot.resolve(windows
                ? Path.of(".venv", "Scripts", "python.exe")
                : Path.of(".venv", "bin", "python"));
        if (Files.isRegularFile(virtualEnvPython)) {
            return virtualEnvPython.toString();
        }
        return windows ? "python" : "python3";
    }

    private static Path resolveServiceRoot(Environment environment) {
        String configured = environment.getProperty("medicare.ai.lifecycle.service-root", "").trim();
        if (!configured.isEmpty()) {
            return Path.of(configured).toAbsolutePath().normalize();
        }

        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        List<Path> candidates = new ArrayList<>(List.of(current, current.resolve("mediacare-backend")));
        if (current.getParent() != null) {
            candidates.add(current.getParent().resolve("mediacare-backend"));
        }
        for (Path candidate : candidates) {
            if (Files.isDirectory(candidate.resolve("speech-service"))
                    && Files.isDirectory(candidate.resolve("ocr-service"))) {
                return candidate;
            }
        }
        return current;
    }

    private static URI parseUri(String name, String value) {
        try {
            return URI.create(value);
        } catch (IllegalArgumentException exception) {
            LOGGER.warn("Cannot auto-start {}: invalid service URL {}.", name, value);
            return null;
        }
    }

    private static URI withHostAndPort(URI endpoint, int port, String path) {
        try {
            int resolvedPort = port >= 0 ? port : ("https".equalsIgnoreCase(endpoint.getScheme()) ? 443 : 80);
            return new URI(endpoint.getScheme(), null, endpoint.getHost(), resolvedPort, path, null, null);
        } catch (URISyntaxException exception) {
            return null;
        }
    }

    private static boolean isLoopback(String host) {
        if (host == null || host.isBlank()) {
            return false;
        }
        try {
            return java.net.InetAddress.getByName(host).isLoopbackAddress();
        } catch (IOException exception) {
            return false;
        }
    }

    @Override
    public synchronized void stop() {
        readinessMonitors.forEach(Thread::interrupt);
        readinessMonitors.clear();
        for (int index = ownedProcesses.size() - 1; index >= 0; index--) {
            Process process = ownedProcesses.get(index);
            if (!process.isAlive()) {
                continue;
            }
            process.destroy();
            try {
                if (!process.waitFor(3, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                    process.waitFor(3, TimeUnit.SECONDS);
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        ownedProcesses.clear();
        running = false;
    }

    @Override
    public void stop(Runnable callback) {
        stop();
        callback.run();
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public boolean isAutoStartup() {
        return true;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }

    int ownedProcessCount() {
        return ownedProcesses.size();
    }

    private static final class HttpEndpointProbe implements EndpointProbe {
        @Override
        public boolean isHealthy(URI uri) {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(1))
                    .GET()
                    .build();
            try {
                return HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() < 400;
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return false;
            } catch (IOException exception) {
                return false;
            }
        }

        @Override
        public boolean isListening(URI uri) {
            int port = uri.getPort();
            if (port < 0) {
                port = "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
            }
            try (java.net.Socket socket = new java.net.Socket()) {
                socket.connect(new InetSocketAddress(uri.getHost(), port), 300);
                return true;
            } catch (IOException exception) {
                return false;
            }
        }
    }
}