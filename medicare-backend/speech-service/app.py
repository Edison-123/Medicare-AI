import os
import tempfile
import threading
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from transformers import pipeline

MODEL_ID = os.getenv("MEDICARE_WHISPER_MODEL", "openai/whisper-small.en")
DEVICE = 0 if torch.cuda.is_available() else -1
transcriber = pipeline("automatic-speech-recognition", model=MODEL_ID, device=DEVICE)
inference_lock = threading.Lock()

app = FastAPI(title="MediCare Speech Recognition")

MAX_AUDIO_BYTES = 25 * 1024 * 1024
FORMAT_SUFFIXES = {
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
}


def transcribe_file(path: str) -> dict:
    with inference_lock, torch.inference_mode():
        return transcriber(path)


@app.get("/health")
def health():
    return {"status": "ready", "provider": MODEL_ID, "device": "cuda" if DEVICE >= 0 else "cpu"}


@app.post("/transcribe")
async def transcribe(request: Request):
    audio = await request.body()
    if not audio:
        raise HTTPException(status_code=400, detail="No audio recording was supplied.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The audio recording is larger than 25 MB.")

    media_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    suffix = FORMAT_SUFFIXES.get(media_type, ".audio")
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as audio_file:
            audio_file.write(audio)
            temporary_path = audio_file.name
        result = await run_in_threadpool(transcribe_file, temporary_path)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Whisper could not decode or transcribe this audio.") from error
    finally:
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)

    text = result.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Whisper did not recognize any speech.")
    return {"text": text, "provider": MODEL_ID, "confidence": None}