"""
Bone-age inference service.

Owns the trained EfficientNet-B3 (refine5) and nothing else: no database, no auth, no notion
of children. Takes an image and a sex, returns a number. The NestJS backend does the
authorisation and record-keeping — contract in docs/ai-integration.md.

Kept for local experimentation and as a reference implementation of the preprocessing chain;
the deployed service runs the same ONNX model in-process inside the Node backend (see
`backend/src/bone-age/bone-age.inference.ts`) to avoid paying for a second always-on Render
instance. This file and that one must be kept in step.

Runs the model through ONNX Runtime, not torch. See convert_to_onnx.py for the reasoning;
briefly, torch does not fit in a 512 MB Render instance alongside a web server.

refine5's training target is raw months, never normalised (confirmed against
src/dataset.py / src/train.py in the model repo) — the model's output is used directly, no
AGE_MEAN/AGE_STD denormalisation step. That was a real blocker for the earlier B0 checkpoint,
which this file used to refuse to serve without those two constants; it no longer applies.
"""

from __future__ import annotations

import io
import os
import time

import cv2
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image

# ---------------------------------------------------------------------------------------
# Preprocessing — confirmed against src/train.py / src/dataset.py in the model repo.
# ---------------------------------------------------------------------------------------

IMG_SIZE = int(os.getenv("IMG_SIZE", "320"))

# CLAHE — deterministic preprocessing applied before resizing, at the image's native
# resolution, to a single grayscale channel. Matches `apply_clahe` in src/train.py exactly.
CLAHE_CLIP_LIMIT = float(os.getenv("CLAHE_CLIP_LIMIT", "2.0"))
CLAHE_TILE_GRID = int(os.getenv("CLAHE_TILE_GRID", "8"))

# ImageNet statistics — confirmed (src/train.py IMAGENET_MEAN/STD).
NORM_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
NORM_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Sex encoding fed to the model's second input — confirmed against src/dataset.py:
# `male` column, 1.0 = male, 0.0 = female.
SEX_MALE = float(os.getenv("SEX_MALE", "1"))
SEX_FEMALE = float(os.getenv("SEX_FEMALE", "0"))

# A result outside this band means something upstream is wrong, not that a child is unusual.
MIN_PLAUSIBLE_MONTHS = 0.0
MAX_PLAUSIBLE_MONTHS = 300.0

MODEL_PATH = os.getenv("MODEL_PATH", "models/bone_age.onnx")
MODEL_VERSION = os.getenv("MODEL_VERSION", "unset")

# Validation-set metric (n=1,425, TTA on) — model repo's MEMORY.md section 5. MAE is the
# headline, but it is a *mean* — roughly a quarter of estimates land further out than a year,
# which is what the UI has to say rather than implying a tight bound. See ACCURACY_WITHIN_12M.
MAE_MONTHS = float(os.getenv("MAE_MONTHS", "0"))
ACCURACY_WITHIN_12M = float(os.getenv("ACCURACY_WITHIN_12M", "0"))

app = FastAPI(title="GrowTH bone-age inference", version=MODEL_VERSION)

_session: ort.InferenceSession | None = None
_load_error: str | None = None


def _load() -> None:
    global _session, _load_error
    if not os.path.exists(MODEL_PATH):
        _load_error = f"no model at {MODEL_PATH}"
        return
    try:
        _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
        _load_error = None
    except Exception as exc:  # noqa: BLE001 — surfaced verbatim on /health
        _load_error = f"{type(exc).__name__}: {exc}"


_load()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if _session is not None else "model_unavailable",
        "modelVersion": MODEL_VERSION,
        "maeMonths": MAE_MONTHS,
        # Shared so the UI can be honest about spread rather than quoting the mean alone.
        "accuracyWithin12Months": ACCURACY_WITHIN_12M,
        "detail": _load_error,
    }


def _preprocess(img: Image.Image) -> np.ndarray:
    """Grayscale -> CLAHE (native resolution) -> resize -> [0,1] -> 3-channel -> normalise."""
    gray = np.asarray(img.convert("L"), dtype=np.uint8)
    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=(CLAHE_TILE_GRID, CLAHE_TILE_GRID))
    enhanced = clahe.apply(gray)
    resized = cv2.resize(enhanced, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LINEAR)

    arr = resized.astype(np.float32) / 255.0
    arr = np.repeat(arr[:, :, None], 3, axis=2)  # 1 channel -> 3 identical channels
    arr = (arr - NORM_MEAN) / NORM_STD
    return np.transpose(arr, (2, 0, 1))[None, ...].astype(np.float32)


@app.post("/predict")
async def predict(image: UploadFile = File(...), sex: str = Form(...)) -> dict:
    if _session is None:
        raise HTTPException(503, f"Model is not loaded ({_load_error}).")
    if sex not in ("MALE", "FEMALE"):
        raise HTTPException(422, "sex must be MALE or FEMALE")

    raw_bytes = await image.read()
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img.load()
    except Exception:  # noqa: BLE001
        raise HTTPException(422, "Could not decode the uploaded file as an image.") from None

    started = time.perf_counter()
    sex_value = np.array([[SEX_MALE if sex == "MALE" else SEX_FEMALE]], dtype=np.float32)
    months = float(_session.run(None, {"image": _preprocess(img), "sex": sex_value})[0].item())

    if not (MIN_PLAUSIBLE_MONTHS <= months <= MAX_PLAUSIBLE_MONTHS):
        raise HTTPException(
            500,
            f"Model returned {months:.1f} months, outside the plausible range — check "
            "preprocessing (CLAHE, resize, sex encoding) against src/train.py in the model repo.",
        )

    return {
        "boneAgeMonths": round(months, 1),
        # Null unless the model produces a genuine uncertainty estimate. This one is a plain
        # regression head with a single scalar output, so it does not. Do not synthesise a
        # confidence percentage for a medical screen.
        "confidence": None,
        "modelVersion": MODEL_VERSION,
        "inferenceMs": int((time.perf_counter() - started) * 1000),
    }
