"""Run a tiny, isolated TrOCR fine-tuning demo on saved OCR samples."""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from huggingface_hub import try_to_load_from_cache
from PIL import Image, ImageOps
from safetensors.torch import save_file
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

MODEL_ID = "microsoft/trocr-base-handwritten"
BACKEND_ROOT = Path(__file__).resolve().parents[1]


def crop_lines(image: Image.Image) -> list[Image.Image]:
    """Match the OCR service's line crops so labels stay paired with input lines."""
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


def sample_root() -> Path:
    configured = os.environ.get("MEDICARE_OCR_TRAINING_DIR", "training-data/ocr")
    path = Path(configured)
    return (path if path.is_absolute() else BACKEND_ROOT / path).resolve()


def load_examples(root: Path, sample_limit: int) -> tuple[list[tuple[Image.Image, str]], list[str]]:
    examples = []
    sample_ids = []
    sample_directories = sorted(path.parent for path in root.glob("*/labels.json"))[:sample_limit]

    for directory in sample_directories:
        metadata = json.loads((directory / "labels.json").read_text(encoding="utf-8"))
        image_name = metadata.get("imageFile", "")
        if not image_name or Path(image_name).name != image_name:
            raise ValueError(f"Sample {directory.name} has an invalid image filename.")

        label_lines = [line.strip() for line in metadata.get("transcription", "").splitlines() if line.strip()]
        if not label_lines:
            raise ValueError(f"Sample {directory.name} has no verified transcription.")

        with Image.open(directory / image_name) as source:
            image_lines = crop_lines(ImageOps.exif_transpose(source).convert("RGB"))
        if len(image_lines) != len(label_lines):
            raise ValueError(
                f"Sample {directory.name} has {len(image_lines)} image lines but {len(label_lines)} label lines."
            )

        examples.extend(zip(image_lines, label_lines))
        sample_ids.append(directory.name)

    if not sample_ids:
        raise ValueError(f"No labeled samples were found in {root}.")
    return examples, sample_ids


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=3, help="Maximum number of sample folders to use (default: 3).")
    parser.add_argument("--epochs", type=int, default=1, help="Training passes over the selected lines (default: 1).")
    parser.add_argument("--learning-rate", type=float, default=1e-5)
    parser.add_argument("--max-length", type=int, default=128)
    args = parser.parse_args()
    if args.samples < 1 or args.epochs < 1 or args.learning_rate <= 0:
        parser.error("samples and epochs must be positive; learning-rate must be greater than zero")

    root = sample_root()
    examples, sample_ids = load_examples(root, args.samples)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cpu":
        torch.set_num_threads(min(4, os.cpu_count() or 1))

    cached_config = try_to_load_from_cache(MODEL_ID, "config.json")
    if not isinstance(cached_config, str):
        raise RuntimeError(f"{MODEL_ID} is not cached. Start the OCR service once to download its model first.")

    print(f"Base model: {MODEL_ID}")
    print(f"Device: {device}")
    print(f"Samples: {len(sample_ids)} images -> {len(examples)} handwriting lines")
    print("Training scope: final TrOCR decoder layer only; all other weights frozen")
    print("This is a demonstration checkpoint, not a production model.")

    processor = TrOCRProcessor.from_pretrained(MODEL_ID, local_files_only=True)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID, local_files_only=True).to(device)
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.eos_token_id = processor.tokenizer.eos_token_id
    model.config.vocab_size = model.config.decoder.vocab_size
    for parameter in model.parameters():
        parameter.requires_grad_(False)

    decoder_layers = model.decoder.model.decoder.layers
    final_layer_index = len(decoder_layers) - 1
    final_layer = decoder_layers[final_layer_index]
    for parameter in final_layer.parameters():
        parameter.requires_grad_(True)
    trainable_parameters = [parameter for parameter in model.parameters() if parameter.requires_grad]
    optimizer = torch.optim.AdamW(trainable_parameters, lr=args.learning_rate)
    model.train()

    losses = []
    for epoch in range(args.epochs):
        for image, text in examples:
            pixel_values = processor(images=image, return_tensors="pt").pixel_values.to(device)
            labels = processor.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=args.max_length,
            ).input_ids.to(device)

            optimizer.zero_grad(set_to_none=True)
            loss = model(pixel_values=pixel_values, labels=labels).loss
            if not torch.isfinite(loss):
                raise RuntimeError("Training produced a non-finite loss; no demo checkpoint was saved.")
            loss.backward()
            torch.nn.utils.clip_grad_norm_(trainable_parameters, max_norm=1.0)
            optimizer.step()
            value = float(loss.detach().cpu())
            losses.append(value)
            print(f"epoch {epoch + 1}/{args.epochs}, line {len(losses)}/{len(examples) * args.epochs}, loss={value:.4f}")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_directory = root / f".demo-run-{timestamp}"
    output_directory.mkdir(parents=True, exist_ok=False)
    trainable_state = {
        name: parameter.detach().cpu().contiguous()
        for name, parameter in model.named_parameters()
        if parameter.requires_grad
    }
    save_file(trainable_state, str(output_directory / "decoder-adapter.safetensors"))
    summary = {
        "baseModel": MODEL_ID,
        "device": str(device),
        "sampleIds": sample_ids,
        "imageCount": len(sample_ids),
        "lineCount": len(examples),
        "epochs": args.epochs,
        "optimizerSteps": len(losses),
        "learningRate": args.learning_rate,
        "trainableScope": f"decoder.model.decoder.layers.{final_layer_index}",
        "trainableParameterCount": sum(parameter.numel() for parameter in trainable_parameters),
        "trainingLosses": losses,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "warning": f"This {len(sample_ids)}-image run has no held-out evaluation and is not suitable for deployment.",
    }
    (output_directory / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Demo adapter: {output_directory / 'decoder-adapter.safetensors'}")
    print(f"Summary: {output_directory / 'summary.json'}")


if __name__ == "__main__":
    main()