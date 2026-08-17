"""
Bone-age inference service.

Owns the trained EfficientNet-B0 and nothing else: no database, no auth, no notion of
children. It takes an image and a sex, and returns a number. The NestJS backend does the
authorisation and the record-keeping — see docs/ai-integration.md for the contract.

Starts successfully even with no checkpoint present, so the rest of the team can run the
stack before the weights land. In that state /predict answers 503 rather than inventing a
number.
"""

from __future__ import annotations

import io
import os
import time

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image
from torchvision import transforms

# ---------------------------------------------------------------------------------------
# Handover constants — the ML team must confirm every one of these.
#
# Guessing any of them produces a plausible-looking number that is simply wrong, with no
# error anywhere. They are listed as items 4, 5 and 6 of the handover checklist in
# docs/ai-integration.md.
# ---------------------------------------------------------------------------------------

IMG_SIZE = 224

# Preprocessing normalisation used during *training*. ImageNet defaults are the common
# choice but must be confirmed, not assumed.
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]

# If the age target was normalised during training, these are that mean/std in months.
# Leave as (0.0, 1.0) when the model already outputs raw months.
#
# This is the classic RSNA integration bug: get it wrong and the model returns something
# like 0.3, which is reported to a parent as "0 months" and looks like a broken model
# rather than an un-denormalised output. A bounds check below refuses to emit a value
# outside a plausible range so this fails loudly instead.
AGE_MEAN = 0.0
AGE_STD = 1.0

# How the model encodes sex. Confirm which value means male, and whether it is concatenated
# to the CNN features or fed through its own branch.
SEX_MALE = 1.0
SEX_FEMALE = 0.0

# A prediction outside this range means something upstream is wrong, not that a child is
# unusual. 0-300 months spans birth to 25 years.
MIN_PLAUSIBLE_MONTHS = 0.0
MAX_PLAUSIBLE_MONTHS = 300.0

MODEL_PATH = os.getenv("MODEL_PATH", "models/bone_age_effnetb0.pt")
MODEL_VERSION = os.getenv("MODEL_VERSION", "unset")
MAE_MONTHS = float(os.getenv("MAE_MONTHS", "0"))

app = FastAPI(title="GrowTH bone-age inference", version=MODEL_VERSION)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_preprocess = transforms.Compose(
    [
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(NORM_MEAN, NORM_STD),
    ]
)

_model: torch.nn.Module | None = None
_load_error: str | None = None


def _load_model() -> None:
    """
    Load the checkpoint if it is there. A missing file is not fatal — the service still
    starts so the backend has something to talk to, and reports the reason on /health.
    """
    global _model, _load_error

    if not os.path.exists(MODEL_PATH):
        _load_error = f"no checkpoint at {MODEL_PATH}"
        return

    try:
        # TorchScript archive: loads with no model class needed. For a bare state_dict,
        # import the ML team's nn.Module here, instantiate it, and load_state_dict instead.
        _model = torch.jit.load(MODEL_PATH, map_location=device).eval()
        _load_error = None
    except Exception as exc:  # noqa: BLE001 - surfaced verbatim on /health
        _load_error = f"{type(exc).__name__}: {exc}"


_load_model()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if _model is not None else "model_unavailable",
        "modelVersion": MODEL_VERSION,
        "maeMonths": MAE_MONTHS,
        "detail": _load_error,
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...), sex: str = Form(...)) -> dict:
    if _model is None:
        raise HTTPException(503, f"Model is not loaded ({_load_error}).")

    if sex not in ("MALE", "FEMALE"):
        raise HTTPException(422, "sex must be MALE or FEMALE")

    raw = await image.read()
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:  # noqa: BLE001
        raise HTTPException(422, "Could not decode the uploaded file as an image.") from None

    started = time.perf_counter()
    tensor = _preprocess(img).unsqueeze(0).to(device)
    sex_tensor = torch.tensor(
        [[SEX_MALE if sex == "MALE" else SEX_FEMALE]], dtype=torch.float32, device=device
    )

    with torch.no_grad():
        out = _model(tensor, sex_tensor)

    months = float(out.squeeze().item()) * AGE_STD + AGE_MEAN

    if not (MIN_PLAUSIBLE_MONTHS <= months <= MAX_PLAUSIBLE_MONTHS):
        raise HTTPException(
            500,
            f"Model returned {months:.1f} months, outside the plausible range. "
            "AGE_MEAN/AGE_STD are the usual cause — check them against the training run.",
        )

    return {
        "boneAgeMonths": round(months, 1),
        # Null unless the model produces a genuine uncertainty estimate. Do not synthesise
        # one: a fabricated confidence percentage on a medical screen is worse than none.
        "confidence": None,
        "modelVersion": MODEL_VERSION,
        "inferenceMs": int((time.perf_counter() - started) * 1000),
    }
