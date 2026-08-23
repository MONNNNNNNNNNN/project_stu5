# Bone-age inference service (`growth-ai`)

FastAPI wrapper around the trained model — a reference implementation and local dev tool.
Holds no database and knows nothing about accounts or children.

**Not what's deployed.** The live service runs the same ONNX export in-process inside the
NestJS backend (`backend/src/bone-age/bone-age.inference.ts`) rather than as a second Render
instance — see that file's docstring for why. This directory exists for local experimentation
and for the one-off `.pth` → `.onnx` conversion (`convert_to_onnx.py`); its preprocessing
(`main.py`) must be kept in step with the backend's by hand, there is no shared code between
Python and TypeScript here.

Contract, backend hook points and failure handling: **`../docs/ai-integration.md`**.

**Status:** current model is **v2, `effnetb3-v5-rsna`** (EfficientNet-B3, refine5). Fully
calibrated — see [Measured performance](#measured-performance). v1 (EfficientNet-B0) was
uncalibrated pending `AGE_MEAN`/`AGE_STD`; that blocker does not apply to v2, whose target was
never normalised. History in `../docs/model-updates.md`.

---

## What the model is

Confirmed directly against `src/model.py` / `src/train.py` in the model repo (not
reverse-engineered, as v1 originally was — see `../docs/model-updates.md` for that history):

```
torchvision EfficientNet-B3, classifier[1] = Identity  ->  1536 pooled features
concat with the sex scalar                             ->  1537
Linear(1537, 128) -> ReLU -> Linear(128, 1)             ->  1 scalar
```

`regressor.0.weight` is `(128, 1537)`: 1536 image features plus one for sex — up from v1's
`(128, 1281)` (EfficientNet-B0's 1280 features). That is why `forward` takes two arguments.

~11.0 M parameters, ~42 MB.

## Measured performance

Validation set (n=1,425, TTA on) — model repo's `MEMORY.md` §5, 2026-08-23:

| Metric | Value |
| --- | --- |
| MAE | **8.12 months** |
| MSE | 115.14 (RMSE 10.73 months) |
| R² | 0.9338 |
| Within ±12 months | **76.8%** |

**Against the benchmark (TOR §6.3).** Leading RSNA Bone Age Challenge entries reach roughly
4.2–4.5 months MAE. At 8.12 we are still noticeably above that — reasonable for a student
project on free compute, and TOR §13 anticipates exactly this outcome, asking for performance
to be *"documented transparently rather than overstating accuracy"*.

**What this means for the UI, and it matters.** 76.8% within ±12 months is the same as saying
**about one estimate in four is still wrong by more than a year**. Showing a parent
"±8.12 months" implies a tightness the model does not have. FR-18 wording should carry both
numbers — see `../docs/ai-integration.md` §8.

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
python convert_to_onnx.py models/best_model_refine5.pth models/bone_age.onnx
```

`convert_to_onnx.py` refuses to write the file if the ONNX output drifts from torch by more
than 1e-4 — an export that silently diverges is the failure worth guarding against.

## Where the weights live

**Not in git.** `.gitignore` blocks `*.pt`, `*.pth`, `*.onnx` and everything in `models/`.

A 16 MB binary in git is carried by every clone forever, cannot be delta-compressed, and gains
a full extra copy on each retrain. Releases are built for this and do not consume the
account's Git LFS quota.

Current release: **[`model-v2`](https://github.com/MONNNNNNNNNNN/project_stu5/releases/tag/model-v2)**
— carries both `bone_age.onnx` (deployed) and the original `.pth` checkpoint, for the record.
`model-v1` (EfficientNet-B0) is still there, in case of a rollback.

```bash
# fetching, if you are running locally
gh release download model-v2 --pattern 'bone_age.onnx' --dir models

# publishing a retrain — full walkthrough in ../docs/model-updates.md
python convert_to_onnx.py models/best_model_v3.pth models/bone_age.onnx
gh release create model-v3 models/bone_age.onnx --notes "…MAE, split, constants…"
# then bump the URL in render.yaml and MODEL_VERSION
```

Render fetches the asset in its build command, so a new model is a release plus a one-line
change.

---

## What is still missing

For v2 (refine5): nothing blocking. Confirmed against the model repo directly:

| # | Item | Status |
| --- | --- | --- |
| 1 | Target normalisation | ✅ none — raw months, used directly |
| 2 | Sex encoding | ✅ male = 1.0, female = 0.0 |
| 3 | `MAE_MONTHS` / accuracy | ✅ 8.12 months / 76.8% within ±12 |
| 4 | Input resolution | ✅ 320 × 320 |
| 5 | Preprocessing | ✅ ImageNet normalise + CLAHE (clipLimit=2.0, 8×8 tiles) |
| 6 | Labelled sample image | still worth getting, as an end-to-end sanity check |

Item 6 is the one thing left worth asking for on every new checkpoint: a known-120-month hand
coming back near 120 confirms the whole preprocessing chain agrees with the model repo's, in
one shot, independent of anything above.

A bounds check still rejects any result outside 0–300 months as a backstop, even though
nothing here is currently a guess.

---

## Running locally

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
gh release download model-v2 --pattern 'bone_age.onnx' --dir models
cp .env.example .env   # already set for v2 — edit if testing a different release

uvicorn main:app --port 8000
```

```bash
curl http://127.0.0.1:8000/health
curl -F "image=@hand.png" -F "sex=MALE" http://127.0.0.1:8000/predict
```

This FastAPI instance is not what the backend calls in dev or prod — `bone-age.inference.ts`
loads the ONNX model directly. Use this only to sanity-check a conversion or a preprocessing
change outside Node before touching the backend. To run the real path locally, put
`models/bone_age.onnx` where `backend/.env`'s `BONE_AGE_MODEL_PATH` points and start the
backend — with no model file present it behaves as it does today: uploads store and list,
predictions stay `PENDING`, nothing errors. A teammate without the model can still run the
whole stack.

---

## Privacy

The images crossing into this service are radiographs of children.

- Only the image and `MALE`/`FEMALE` are sent — no name, no date of birth, no identifiers. The
  service cannot re-identify a child from what it receives. Keep it that way.
- Nothing is persisted: the upload is held in memory for the request and dropped.
- Image bytes are never logged.
- The service needs no database access and has none.
