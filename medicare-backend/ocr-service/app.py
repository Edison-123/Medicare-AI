import base64
import binascii
import io
import os
import threading
from pathlib import Path

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, ImageOps, UnidentifiedImageError
from safetensors.torch import load_file
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

MODEL_ID = "microsoft/trocr-base-handwritten"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BACKEND_ROOT = Path(__file__).resolve().parents[1]
processor = TrOCRProcessor.from_pretrained(MODEL_ID)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID).to(DEVICE).eval()
model_parameters = dict(model.named_parameters())
decoder_layer_index = len(model.decoder.model.decoder.layers) - 1
decoder_layer_prefix = f"decoder.model.decoder.layers.{decoder_layer_index}."
training_adapter_state = {}
base_decoder_state = {}
training_adapter_path = None
training_adapter_error = None
inference_lock = threading.Lock()


def find_training_adapter() -> Path | None:
    configured_path = os.environ.get("MEDICARE_OCR_TRAINING_ADAPTER_PATH")
    if configured_path:
        path = Path(configured_path).expanduser()
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()

    training_root = BACKEND_ROOT / "training-data" / "ocr"
    candidates = list(training_root.glob(".demo-run-*/decoder-adapter.safetensors"))
    return max(candidates, key=lambda path: path.stat().st_mtime) if candidates else None


def copy_decoder_state(state: dict[str, torch.Tensor]) -> None:
    with torch.no_grad():
        for name, value in state.items():
            parameter = model_parameters[name]
            parameter.copy_(value.to(device=parameter.device, dtype=parameter.dtype))


try:
    candidate_path = find_training_adapter()
    if candidate_path is not None:
        if not candidate_path.is_file():
            raise FileNotFoundError(f"Training adapter not found: {candidate_path}")
        loaded_state = load_file(str(candidate_path), device="cpu")
        expected_names = {
            name for name in model_parameters if name.startswith(decoder_layer_prefix)
        }
        if set(loaded_state) != expected_names:
            raise ValueError("Training adapter does not match the current TrOCR decoder layer.")
        training_adapter_state = loaded_state
        base_decoder_state = {
            name: model_parameters[name].detach().cpu().clone()
            for name in expected_names
        }
        training_adapter_path = candidate_path
        print(f"Loaded OCR training adapter: {candidate_path.name}", flush=True)
except Exception as error:
    training_adapter_error = str(error)
    print(f"OCR training adapter unavailable: {training_adapter_error}", flush=True)

app = FastAPI(title="MediCare Handwriting OCR")


class OcrRequest(BaseModel):
    image: str = Field(min_length=1)
    use_training_adapter: bool = Field(default=False, alias="useTrainingAdapter")


def crop_lines(image: Image.Image) -> list[Image.Image]:
    grayscale = ImageOps.grayscale(image)
    pixels = np.asarray(grayscale)
    ink = pixels < 220
    row_ink = np.count_nonzero(ink, axis=1)
    active_rows = row_ink >= max(1, int(grayscale.width * 0.001))

    row_indexes = np.flatnonzero(active_rows)
    if row_indexes.size == 0:
        return []

    gap_limit = max(4, int(grayscale.height * 0.01))
    groups = []
    start = previous = int(row_indexes[0])
    for row in row_indexes[1:]:
        row = int(row)
        if row - previous > gap_limit + 1:
            groups.append([start, previous + 1])
            start = row
        previous = row
    groups.append([start, previous + 1])

    typical_height = float(np.median([end - start for start, end in groups]))
    merge_distance = max(8, int(typical_height * 0.6))
    for index in range(len(groups) - 1, -1, -1):
        start, end = groups[index]
        if end - start >= typical_height * 0.3 or len(groups) == 1:
            continue
        neighbors = [candidate for candidate in range(len(groups)) if candidate != index]
        nearest = min(neighbors, key=lambda candidate: min(
            abs(start - groups[candidate][1]), abs(groups[candidate][0] - end)
        ))
        neighbor_start, neighbor_end = groups[nearest]
        distance = max(neighbor_start - end, start - neighbor_end, 0)
        if distance <= merge_distance:
            groups[nearest] = [min(start, neighbor_start), max(end, neighbor_end)]
            groups.pop(index)

    lines = []
    for start, end in sorted(groups):
        top = max(0, start - max(6, int((end - start) * 0.15)))
        bottom = min(grayscale.height, end + max(6, int((end - start) * 0.15)))
        line_pixels = ink[top:bottom]
        columns = np.flatnonzero(np.count_nonzero(line_pixels, axis=0))
        if columns.size == 0:
            continue
        left, right = int(columns[0]), int(columns[-1]) + 1
        horizontal_padding = max(8, int((right - left) * 0.04))
        vertical_padding = max(6, int((bottom - top) * 0.05))
        bounds = (
            max(0, left - horizontal_padding),
            max(0, top - vertical_padding),
            min(grayscale.width, right + horizontal_padding),
            min(grayscale.height, bottom + vertical_padding),
        )
        lines.append(ImageOps.autocontrast(grayscale.crop(bounds)).convert("RGB"))
    return lines


@app.get("/health")
def health():
    return {
        "status": "ready",
        "provider": MODEL_ID,
        "device": str(DEVICE),
        "trainingAdapterAvailable": bool(training_adapter_state),
        "trainingAdapter": training_adapter_path.name if training_adapter_path else None,
    }


@app.post("/ocr")
def recognize(request: OcrRequest):
    if request.use_training_adapter and not training_adapter_state:
        detail = "The TrOCR training adapter is unavailable."
        if training_adapter_error:
            detail = f"{detail} {training_adapter_error}"
        raise HTTPException(status_code=503, detail=detail)

    payload = request.image.partition(",")[2] if "," in request.image else request.image
    try:
        raw_image = base64.b64decode(payload, validate=True)
        with Image.open(io.BytesIO(raw_image)) as opened_image:
            image = ImageOps.exif_transpose(opened_image).convert("RGB")
    except (binascii.Error, UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="The supplied image is invalid.") from error

    if image.width * image.height > 20_000_000:
        raise HTTPException(status_code=413, detail="The supplied image is too large to process.")

    lines = crop_lines(image)
    if not lines:
        raise HTTPException(status_code=422, detail="No handwriting was found in the image.")

    recognized_lines = []
    try:
        with inference_lock:
            try:
                if request.use_training_adapter:
                    copy_decoder_state(training_adapter_state)
                with torch.inference_mode():
                    for line in lines:
                        pixel_values = processor(images=line, return_tensors="pt").pixel_values.to(DEVICE)
                        generated_ids = model.generate(pixel_values, max_new_tokens=128, num_beams=4)
                        recognized_lines.append(
                            processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
                        )
            finally:
                if request.use_training_adapter:
                    copy_decoder_state(base_decoder_state)
    except Exception as error:
        raise HTTPException(status_code=500, detail="The handwriting model failed to process the image.") from error

    text = "\n".join(line for line in recognized_lines if line)
    if not text:
        raise HTTPException(status_code=422, detail="TrOCR could not read the handwriting.")

    provider = f"{MODEL_ID}+training-adapter" if request.use_training_adapter else MODEL_ID
    return {"text": text, "provider": provider, "confidence": None}