# OCR Training Samples

The `/ocr-training` page stores each approved sample in its own directory:

- `sample.png`: the handwritten image
- `labels.json`: the verified `transcription`, OCR `recognizedText`, image name, schema version, and creation time

The verified transcription is the ground-truth label. Sample files are ignored by Git to avoid accidentally committing collected handwriting. Do not include identifiable patient information.

Doctors can also save the live consultation OCR image, original prediction, and corrected transcription from the consultation review. Confirm that both the image and text are de-identified before saving. This adds a labeled sample to the same directory; it does not update the running OCR model automatically.

Set `MEDICARE_OCR_TRAINING_DIR` to store the dataset elsewhere.

## Fine-tuning demo

From the `medicare-backend` directory, run:

```powershell
.\.venv\Scripts\python.exe .\ocr-service\train_demo.py --samples 3 --epochs 1
```

The demo crops the handwritten lines, makes one update per line on the final TrOCR decoder layer, and saves a decoder-only checkpoint plus a loss summary in an ignored `.demo-run-*` folder. It does not replace the model served by the OCR API. Three images demonstrate the training pipeline only; they are far too few to judge accuracy or produce a deployable model.

The OCR service automatically picks the newest `.demo-run-*/decoder-adapter.safetensors` at startup. Only OCR requests from `/ocr-training` ask the service to use it; regular consultation OCR continues using the base model. Set `MEDICARE_OCR_TRAINING_ADAPTER_PATH` to choose a specific adapter. Restart the OCR service after changing or creating an adapter.