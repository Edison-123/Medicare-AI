# MediCare AI

MediCare AI is a role-based healthcare management application for patients, doctors, and administrators. It combines a React web client with a Spring Boot REST API, MySQL persistence, and optional local AI services for consultation transcription, handwriting OCR, clinical summaries, and prescription assistance.

> **Clinical safety:** AI-generated summaries, medication mappings, and interaction screening are untrusted drafts. They are not diagnoses, prescribing instructions, or a clinical interaction-database substitute. A licensed clinician must verify all content before approval or issuance.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Local Setup](#local-setup)
- [AI Services](#ai-services)
- [Testing](#testing)
- [API and Security](#api-and-security)
- [Project Layout](#project-layout)

## Features

### Patient

- View health summaries, medical records, prescriptions, and visit summaries.
- Book and manage appointments, message the care team, and review lab tests.
- Create medicine reminders with multiple daily times, track doses, and delete reminders with confirmation.
- Manage profile details, profile photo, and account security.

### Doctor

- Review assigned patients and conduct consultations in a clinical workspace.
- Record consultation notes, transcribe audio, process handwriting, and review AI-extracted fields.
- Create Draft prescriptions from completed consultations, map medication details with AI, edit, review, and finalize prescriptions.
- Check medication pairs with the experimental local Ollama interaction screener.
- View reports, messages, and workflow settings.

### Administrator

- Manage doctor and patient records, hospitals, prescriptions, audit logs, reports, and system settings.

## Architecture

```text
Browser
  medicare/ (React + Vite)
      | /api proxy
      v
  medicare-backend/ (Spring Boot REST API, JWT security, JPA)
      |-- MySQL
      |-- Ollama (summaries, prescription mapping, interaction screening)
      |-- speech-service/ (Whisper transcription, port 8082)
      `-- ocr-service/ (handwriting OCR, port 8081)
```

The frontend uses React Router for role-based application areas. Vite proxies `/api` requests to `http://localhost:8080`; Spring Boot serves the API under the `/api` context path. The backend owns authentication, authorization, persistence, and business rules.

## Requirements

- Node.js and npm compatible with the Vite version in `medicare/package.json`.
- Java 21 and Maven.
- MySQL.
- Optional for local AI: Ollama, Python 3.12, and the model/service dependencies described below.

## Local Setup

### 1. Configure MySQL and backend environment

Copy `medicare-backend/.env.example` to `medicare-backend/.env` if a local file does not already exist. Set your local values there; do not commit credentials. At minimum, configure:

```properties
MYSQL_USERNAME=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MEDICARE_JWT_SECRET=your_base64_encoded_secret
```

`MEDICARE_JWT_SECRET` must be Base64 and decode to at least 32 bytes. The default database URL targets `localhost:3306/medicare_db`; set `MYSQL_URL` if your database uses another host, schema, or connection options. `MYSQL_USERNAME` and `MYSQL_PASSWORD` are required. The application uses the MySQL Spring profile and updates the schema through Hibernate by default.

No demo accounts or clinical records are seeded automatically. Provision user accounts through the application’s admin workflow or your approved local setup process before signing in.

### 2. Start the backend

From the repository root:

```powershell
cd medicare-backend
mvn spring-boot:run
```

The API starts at `http://localhost:8080/api` when its database and required environment values are available.

### 3. Start the frontend

In a second terminal, from the repository root:

```powershell
cd medicare
npm install
npm run dev
```

Open `http://localhost:5173`. To build the production bundle:

```powershell
npm run build
```

For frontend-specific notes, see [medicare/README.md](medicare/README.md) and [medicare/INTEGRATION-README.md](medicare/INTEGRATION-README.md).

## AI Services

AI services are optional for core application workflows. On startup, the backend checks configured local Ollama, Whisper, and TrOCR services and can start missing local services when automatic startup is enabled. It does not install Python packages or pull Ollama models. Already-running services are left running when Spring Boot shuts down.

### Ollama

The default Ollama endpoint is `http://localhost:11434/api/chat` and the default model is `qwen2.5:1.5b`.

```powershell
ollama pull qwen2.5:1.5b
```

Configure `MEDICARE_OLLAMA_URL` or `MEDICARE_OLLAMA_MODEL` to use another local Ollama endpoint or installed model. Prescription suggestions and drug-interaction screening are experimental model output; they may omit or misclassify information.

### Whisper and TrOCR

The local speech service defaults to port `8082`; handwriting OCR defaults to port `8081`. Python service dependencies are in:

- `medicare-backend/speech-service/requirements.txt`
- `medicare-backend/ocr-service/requirements.txt`

To install both into the backend virtual environment:

```powershell
cd medicare-backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r speech-service\requirements.txt -r ocr-service\requirements.txt
```

Automatic model loading is offline by default. Make sure the required model weights are already cached or set `MEDICARE_AI_HF_OFFLINE=false` to allow downloads. Audio decoding requires FFmpeg on `PATH`.

Useful configuration variables include:

- `MEDICARE_AI_AUTOSTART`: enable or disable automatic local-service startup.
- `MEDICARE_AI_SERVICE_ROOT`: override the service source directory.
- `MEDICARE_AI_PYTHON`: select the Python executable used for services.
- `MEDICARE_AI_READINESS_TIMEOUT_SECONDS`: change the service readiness timeout.
- `MEDICARE_WHISPER_URL` and `MEDICARE_TROCR_URL`: override service endpoints.

The training data under `medicare-backend/training-data/ocr` and `RxHandBD_TroCR_Ready` is optional OCR experimentation material; it is not required to run the main web application and is excluded from Git. Keep approved, de-identified datasets in local storage or distribute them through an appropriate dataset host.

## Testing

### Frontend

```powershell
cd medicare
npm run build
npm run test:e2e
```

Authenticated Playwright portal tests require `MEDICARE_TEST_PASSWORD` to be configured in the test environment. Playwright uses Chromium and starts Vite automatically when needed.

### Backend

```powershell
cd medicare-backend
mvn test
```

The Maven project targets Java 21. Running Mockito-based tests on newer Java runtimes may require a newer Byte Buddy/Mockito version.

## API and Security

- REST endpoints are served beneath `/api`.
- OpenAPI documentation is available at `http://localhost:8080/api/swagger-ui.html` while the backend is running.
- Login uses `POST /api/auth/login`; protected endpoints use JWT authentication.
- Authorization is enforced by role and, for patient/doctor records, ownership or assignment checks.
- The frontend sends the JWT with authenticated API calls and clears the local session after an unauthorized response.

## Project Layout

```text
.
|-- medicare/                     # React/Vite frontend and Playwright tests
|   |-- src/pages/                # Patient, doctor, admin, and shared screens
|   |-- src/services/api/         # REST client
|   `-- tests/                    # Browser end-to-end tests
|-- medicare-backend/             # Spring Boot API and Java tests
|   |-- src/main/java/            # Controllers, services, entities, security
|   |-- src/test/java/            # Backend unit tests
|   |-- ocr-service/              # Handwriting OCR service
|   |-- speech-service/           # Speech transcription service
|   `-- training-data/ocr/        # OCR sample/training data
`-- RxHandBD_TroCR_Ready/         # Separate OCR dataset and report
```