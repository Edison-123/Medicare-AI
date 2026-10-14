# MediCare Frontend + Backend Integration

This project is configured as a real React/Vite frontend connected to the Spring Boot MediCare backend.

## Authentication

The frontend no longer uses demo credentials or a frontend role switcher.

Login is always sent to:

`POST /api/auth/login`

The backend validates the email and BCrypt password against the `users` table in MySQL and returns a JWT plus the authenticated user role. The frontend stores that session and routes the user to:

- `ROLE_ADMIN` -> `/admin/dashboard`
- `ROLE_DOCTOR` -> `/doctor/dashboard`
- `ROLE_PATIENT` -> `/patient/dashboard`

## Local development

Backend:

```powershell
cd mediacare-backend
# Configure your existing local, untracked .env with private database, JWT, and seed-user values.
# MEDICARE_JWT_SECRET must be Base64 and decode to at least 32 bytes.
mvn clean spring-boot:run
```

Frontend:

```powershell
cd mediacare
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8080`, so the browser calls the same API origin used by the application.

## Database

The included backend uses MySQL:

- Host: `localhost`
- Port: `3306`
- Database: `medicare_db`
- Username: `root`
- Set `MYSQL_PASSWORD` in your existing local `.env` file; Git ignores this file.
- Set `SEED_USER_PASSWORD` to the initial password used when an administrator onboards a doctor.

## Clear Local Data

`mediacare-backend/clear-local-demo-data.sql` deletes all rows from the MediCare tables in the currently selected MySQL schema, including every user account. Back up the local database and verify the selected schema before running it. The script is manual and is never run by the application. The backend no longer creates demo users or clinical records at startup; provision real local accounts before signing in again.

## Admin patient registration

The Admin -> Patients screen now has **Register Patient**. It calls:

`POST /api/admin/patients`

The backend creates both:

1. a `users` row with `ROLE_PATIENT` and a BCrypt password
2. a matching `patients` row

After registration, the patient can sign in from the normal login screen using the email/password entered by the administrator.

## JWT handling

Authenticated API calls automatically send:

`Authorization: Bearer <JWT>`

A 401 response clears the frontend session and sends the user back to login.

## AI features

When Spring Boot starts, it checks the local Ollama, Whisper, and TrOCR endpoints and starts only missing local services. It does not start configured remote endpoints, install packages, or pull Ollama models. Processes started by Spring Boot are stopped when the backend shuts down; already-running services are left alone. Set `MEDICARE_AI_AUTOSTART=false` to disable this behavior.

The Python services use `mediacare-backend/.venv` by default. Install their requirements there once:

```powershell
cd mediacare-backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r speech-service\requirements.txt -r ocr-service\requirements.txt
```

Automatic model loading is offline by default to prevent multi-gigabyte downloads during backend startup. Ensure the model weights are in the Hugging Face cache, or set `MEDICARE_AI_HF_OFFLINE=false` to allow the Python services to download them. The readiness warning timeout defaults to 300 seconds and can be changed with `MEDICARE_AI_READINESS_TIMEOUT_SECONDS`.

Override the service source directory with `MEDICARE_AI_SERVICE_ROOT`, the Python executable with `MEDICARE_AI_PYTHON`, and the Ollama executable with `MEDICARE_OLLAMA_COMMAND`. Ollama itself must be installed, and the configured model must be pulled once with `ollama pull <model>`.

Handwriting OCR uses the local Microsoft TrOCR handwritten model and does not require a paid API key. To run the service manually when automatic startup is disabled:

```powershell
cd mediacare-backend/ocr-service
..\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8001
```

The first model load can take several minutes and requires several gigabytes of free disk space. Spring Boot calls it at `http://localhost:8001/ocr`; override this with `MEDICARE_TROCR_URL` if needed. The command above is for running TrOCR manually when automatic startup is disabled.

Speech-to-text uses a local Whisper model. Run it manually only when automatic startup is disabled:

```powershell
cd mediacare-backend/speech-service
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8002
```

By default, Whisper uses `openai/whisper-small.en`; set `MEDICARE_WHISPER_MODEL` to use a different Transformers-compatible ASR model, or `MEDICARE_WHISPER_URL` to change the endpoint Spring Boot calls. Audio decoding requires FFmpeg on `PATH`. The Spring Boot endpoint remains `POST /api/ai/transcription` and accepts the audio upload used by the consultation recorder.

Transcription is available to authenticated doctors and administrators.

Clinical summaries use a local Ollama model. With Ollama running, install the default model once:

```powershell
ollama pull qwen2.5:1.5b
```

Spring Boot calls Ollama at `http://localhost:11434/api/chat`. Override this with `MEDICARE_OLLAMA_URL`, or select another installed model with `MEDICARE_OLLAMA_MODEL`. The authenticated endpoint is `POST /api/ai/summary` and is available to doctors and administrators. Summary fields require matching source excerpts from consultation fields, notes, OCR, or the unattributed transcript. Unsupported fields remain blank, and transcript-derived fields require doctor review before completion.

The authenticated summary endpoint accepts consultation data, notes, OCR text, and audio transcripts. Transcript evidence is unattributed: the system does not identify or infer speakers. Transcript-derived suggestions require clinician review, and unsupported or unquoted fields remain blank.

Whisper returns plain text and does not identify speakers. Paste or edit the full conversation without adding speaker prefixes. The summary service can extract quote-backed suggestions from it, but does not claim that a speaker said something; a clinician must verify every suggestion before completing the consultation. The local model is a general-purpose model, not a clinically validated diagnostic system; generated drafts must be checked by the clinician.

Prescription suggestions are separate and are not provided by the clinical summary service.

## Important

The frontend has no mock-data mode or seeded demo accounts. Users must be provisioned in the backend database before signing in.
