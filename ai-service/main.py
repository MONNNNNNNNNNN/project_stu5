"""
Bone-age inference service.

Owns the trained EfficientNet-B0 and nothing else: no database, no auth, no notion of
children. Takes an image and a sex, returns a number. The NestJS backend does the
authorisation and record-keeping — contract in docs/ai-integration.md.

Runs the model through ONNX Runtime, not torch. See convert_to_onnx.py for the reasoning;
briefly, torch does not fit in a 512 MB Render instance alongside a web server.

The service starts even when it cannot serve, and says why on /health. Two states matter:

  - no model file        -> /predict 503, "no checkpoint"
  - no calibration       -> /predict 503, "AGE_MEAN/AGE_STD not set"

That second one is deliberate and is the whole reason this file refuses to guess. The
handed-over checkpoint emits values around 2.4, not around 120, so its training target was
normalised. Turning 2.4 into months needs the mean and standard deviation used in training,
and those did not come with the weights. Inventing them would produce a confident, wrong bone
age on a medical screen, which is worse than an outage.
"""

from __future__ import annotations

import io
import os
import time

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image

# ---------------------------------------------------------------------------------------
# Preprocessing — must match training exactly. Confirm each of these with the ML team.
# ---------------------------------------------------------------------------------------

IMG_SIZE = int(os.getenv("IMG_SIZE", "224"))

# ImageNet statistics. Standard for a torchvision EfficientNet-B0, but standard is not the
# same as confirmed.
NORM_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
NORM_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Sex encoding fed to the model's second input. The checkpoint gives no clue which value
# meant male, and a flip degrades accuracy quietly rather than crashing.
SEX_MALE = float(os.getenv("SEX_MALE", "1"))
SEX_FEMALE = float(os.getenv("SEX_FEMALE", "0"))

# Target denormalisation: months = raw * AGE_STD + AGE_MEAN. Unset means "unknown", and the
# service refuses to predict rather than guessing. Set both from the training run.
_age_mean = os.getenv("AGE_MEAN")
_age_std = os.getenv("AGE_STD")
AGE_MEAN = float(_age_mean) if _age_mean else None
AGE_STD = float(_age_std) if _age_std else None

# A result outside this band means something upstream is wrong, not that a child is unusual.
MIN_PLAUSIBLE_MONTHS = 0.0
MAX_PLAUSIBLE_MONTHS = 300.0

MODEL_PATH = os.getenv("MODEL_PATH", "models/bone_age.onnx")
MODEL_VERSION = os.getenv("MODEL_VERSION", "unset")

# Measured on the held-out test set (TOR §6.3). MAE is the headline, but it is a *mean* —
# roughly a quarter of estimates land further out than a year, which is what the UI has to
# say rather than implying a tight bound. See ACCURACY_WITHIN_12M.
MAE_MONTHS = float(os.getenv("MAE_MONTHS", "0"))
ACCURACY_WITHIN_12M = float(os.getenv("ACCURACY_WITHIN_12M", "0"))

# The reported MSE and R² pin the spread of the test set's true bone ages:
#   Var(y) = MSE / (1 - R²) = 135.91 / 0.0781  ->  SD ≈ 41.7 months
# If the training target was normalised by the dataset's own standard deviation — the usual
# choice — then AGE_STD should land near this. It is only a cross-check, because a team may
# normalise by something else, so a mismatch warns rather than refuses.
EXPECTED_AGE_STD = 41.7
AGE_STD_TOLERANCE = 10.0

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


def _calibrated() -> bool:
    return AGE_MEAN is not None and AGE_STD is not None


def _calibration_warning() -> str | None:
    """Flag an AGE_STD that disagrees with what the reported metrics imply."""
    if AGE_STD is None:
        return None
    if abs(AGE_STD - EXPECTED_AGE_STD) > AGE_STD_TOLERANCE:
        return (
            f"AGE_STD={AGE_STD} is far from the ~{EXPECTED_AGE_STD} months implied by the "
            f"reported MSE and R². Predictions will be scaled wrongly if this is a mistake."
        )
    return None


@app.get("/health")
def health() -> dict:
    if _session is None:
        status = "model_unavailable"
    elif not _calibrated():
        status = "uncalibrated"
    else:
        status = "ok"
    return {
        "status": status,
        "modelVersion": MODEL_VERSION,
        "maeMonths": MAE_MONTHS,
        # Shared so the UI can be honest about spread rather than quoting the mean alone.
        "accuracyWithin12Months": ACCURACY_WITHIN_12M,
        "detail": _load_error
        or (None if _calibrated() else "AGE_MEAN/AGE_STD not set; refusing to guess months")
        or _calibration_warning(),
        "warning": _calibration_warning(),
    }


def _preprocess(img: Image.Image) -> np.ndarray:
    img = img.convert("RGB").resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = (arr - NORM_MEAN) / NORM_STD
    return np.transpose(arr, (2, 0, 1))[None, ...].astype(np.float32)


@app.post("/predict")
async def predict(image: UploadFile = File(...), sex: str = Form(...)) -> dict:
    if _session is None:
        raise HTTPException(503, f"Model is not loaded ({_load_error}).")
    if not _calibrated():
        raise HTTPException(
            503,
            "Model is loaded but not calibrated: AGE_MEAN and AGE_STD are unset, so a raw "
            "output cannot be converted to months. Set them from the training run.",
        )
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
    raw = float(_session.run(None, {"image": _preprocess(img), "sex": sex_value})[0].item())
    months = raw * AGE_STD + AGE_MEAN

    if not (MIN_PLAUSIBLE_MONTHS <= months <= MAX_PLAUSIBLE_MONTHS):
        raise HTTPException(
            500,
            f"Model returned {months:.1f} months, outside the plausible range. "
            f"Raw output was {raw:.4f}; AGE_MEAN/AGE_STD are the usual cause.",
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
