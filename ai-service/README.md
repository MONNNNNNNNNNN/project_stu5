# Bone-age inference service (`growth-ai`)

FastAPI wrapper around the trained EfficientNet-B0. One endpoint the NestJS backend calls; it
holds no database and knows nothing about accounts or children.

Contract, backend hook points and failure handling: **`../docs/ai-integration.md`**.

**Status:** deployed on Render as a second service, serving, and **uncalibrated** — see
[What is still missing](#what-is-still-missing). `/predict` returns 503 until two constants
arrive from the ML team.

---

## What the model turned out to be

The handover was a bare PyTorch `state_dict` with no architecture file. It was recovered from
the tensor shapes and then verified — `load_state_dict(strict=True)` reports **0 missing and
0 unexpected keys**, so `model.py` is the exact network the weights were trained in:

```
torchvision EfficientNet-B0, classifier = Identity     ->  1280 pooled features
concat with the sex scalar                             ->  1281
Linear(1281, 128) -> ReLU -> Linear(128, 1)            ->  1 scalar
```

The tell was `regressor.0.weight` at (128, **1281**): 1280 image features plus one for sex.
That is why `forward` takes two arguments.

4.21 M parameters, ~16 MB.

## Why the server runs ONNX and not PyTorch

|  | torch | ONNX Runtime |
| --- | --- | --- |
| disk | 635 MB | 58 MB |
| resident after one inference | 374 MB | ~100 MB |
| per inference | — | ~24 ms |

Render's free instance is **512 MB total**. torch plus uvicorn plus Pillow does not fit, and
an OOM-killed service is worse than a slow one. The two runtimes agree to **3e-06** on the
same input, so nothing is lost.

Conversion happens locally, once per trained model:

```bash
pip install -r requirements-convert.txt
python convert_to_onnx.py models/best_model.pt models/bone_age.onnx
```

`convert_to_onnx.py` refuses to write the file if the ONNX output drifts from torch by more
than 1e-4 — an export that silently diverges is the failure worth guarding against.

## Where the weights live

**Not in git.** `.gitignore` blocks `*.pt`, `*.pth`, `*.onnx` and everything in `models/`.

A 16 MB binary in git is carried by every clone forever, cannot be delta-compressed, and gains
a full extra copy on each retrain. Releases are built for this and do not consume the
account's Git LFS quota.

Current release: **[`model-v1`](https://github.com/MONNNNNNNNNNN/project_stu5/releases/tag/model-v1)**
— carries both `bone_age.onnx` (deployed) and `m.bin` (the original checkpoint, for the record).

```bash
# fetching, if you are running locally
gh release download model-v1 --pattern 'bone_age.onnx' --dir models

# publishing a retrain
python convert_to_onnx.py models/best_model_v2.pt models/bone_age.onnx
gh release create model-v2 models/bone_age.onnx --notes "…MAE, split, constants…"
# then bump the URL in render.yaml and MODEL_VERSION
```

Render fetches the asset in its build command, so a new model is a release plus a one-line
change.

---

## What is still missing

The service **will not return a bone age yet**, on purpose.

The checkpoint emits values around **2.4**, not around 120. Its training target was
normalised, so months are `raw * AGE_STD + AGE_MEAN` — and those two numbers did not come with
the weights. Guessing them produces a confident, wrong bone age on a medical screen, which is
worse than an outage. `/health` reports `uncalibrated` and `/predict` returns 503 until both
env vars are set.

Needed from the ML team, in order of how badly each breaks things:

| # | Item | If wrong / missing |
| --- | --- | --- |
| 1 | **`AGE_MEAN` / `AGE_STD`** from the training run | **blocking** — no prediction at all |
| 2 | **Sex encoding** — which value meant male | quietly worse for one sex, no error |
| 3 | **`MAE_MONTHS`** on the held-out test set | the "±" shown to parents is fiction (TOR FR-18, §6.3) |
| 4 | Input resolution, if not 224 | silently degraded accuracy |
| 5 | Normalisation mean/std, if not ImageNet | silently degraded accuracy |
| 6 | 2–3 sample images with expected outputs | without these we can confirm it returns *a* number, not the *right* one |

A bounds check rejects any result outside 0–300 months, so a wrong denormalisation fails loudly
instead of reaching a parent. That is a backstop, not a substitute for item 1.

---

## Running locally

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
gh release download model-v1 --pattern 'bone_age.onnx' --dir models

export MODEL_VERSION=effnetb0-v1-rsna
export AGE_MEAN=...   # from the ML team
export AGE_STD=...
export MAE_MONTHS=...

uvicorn main:app --port 8000
```

```bash
curl http://127.0.0.1:8000/health
curl -F "image=@hand.png" -F "sex=MALE" http://127.0.0.1:8000/predict
```

Then point the backend at it in `backend/.env`:

```bash
BONE_AGE_SERVICE_URL="http://127.0.0.1:8000"
BONE_AGE_TIMEOUT_MS=30000
```

With `BONE_AGE_SERVICE_URL` unset the backend behaves as it does today — uploads store and
list, predictions stay `PENDING`, nothing errors. A teammate without the model can still run
the whole stack.

---

## Privacy

The images crossing into this service are radiographs of children.

- Only the image and `MALE`/`FEMALE` are sent — no name, no date of birth, no identifiers. The
  service cannot re-identify a child from what it receives. Keep it that way.
- Nothing is persisted: the upload is held in memory for the request and dropped.
- Image bytes are never logged.
- The service needs no database access and has none.
