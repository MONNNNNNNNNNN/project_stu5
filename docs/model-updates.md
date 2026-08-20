# Updating the bone-age model

Training continues, so this is the loop for shipping a retrain: **fetch, convert, verify,
release, bump, test.** No code changes — only a URL, a version string, and the measured
numbers.

Budget about **15 minutes**, most of it Render rebuilding.

```
 Google Drive (ML team)
      │  best_model.pt
      ▼
 0. fetch   ──► best_model.pt on disk       gdown
      ▼
 1. convert ──► bone_age.onnx               ai-service/convert_to_onnx.py
      ▼
 2. verify  ──► all checks pass             backend: npm run verify:model
      ▼
 3. release ──► model-vN asset              gh release create
      ▼
 4. bump    ──► render.yaml URL + version   push, Render rebuilds (~4 min)
      ▼
 5. test    ──► PASS against production     scripts/smoke-bone-age.sh
```

Steps 2 and 5 are both required and they test different things. `verify:model` proves the
weights work **on your machine**. The smoke test proves the **deployed service** picked them
up. A release can pass the first and fail the second — that is exactly the case where the
build silently failed to fetch the asset.

---

## 0. Get the checkpoint out of Google Drive

Do not `curl` a Drive share link. For anything but a small file Drive returns an HTML
virus-scan interstitial, and `curl -o best_model.pt` will happily save that HTML page under a
`.pt` name. The failure then surfaces three steps later as an unintelligible torch error.

```bash
pip install gdown
cd ai-service

# Works with the whole share URL. The file must be shared as "anyone with the link".
gdown --fuzzy 'https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing' -O models/best_model.pt

# For a shared folder instead of a single file:
gdown --folder 'https://drive.google.com/drive/folders/<FOLDER_ID>' -O models/
```

**Check what you actually got before going further.** `torch.save` writes a ZIP container, so
a real checkpoint reports as ZIP data:

```bash
ls -lh models/best_model.pt
file models/best_model.pt
# models/best_model.pt: Zip archive data          <- good
# models/best_model.pt: HTML document text        <- you downloaded the interstitial
```

Then look inside it, before trusting it:

```bash
python -c "
import torch
sd = torch.load('models/best_model.pt', map_location='cpu')
sd = sd.get('state_dict', sd)
print(len(sd), 'tensors')
print('regressor.0.weight', tuple(sd['regressor.0.weight'].shape))
"
# regressor.0.weight (128, 1281)
```

`(128, 1281)` is the architecture fingerprint: 1280 pooled EfficientNet-B0 features plus the
concatenated sex scalar. **If that shape changed, the architecture changed** — stop and update
`ai-service/model.py` first, because step 1 loads with `strict=True` and will refuse.

Ask the ML team, in the same message as the file:

- `AGE_MEAN` / `AGE_STD` — the constants the training target was normalised with
- the metrics: MAE, MSE, R², and share within ±12 months
- **one labelled sample image** with its true bone age (see [below](#the-one-thing-that-would-settle-everything))

---

## 1. Convert to ONNX

```bash
cd ai-service
pip install -r requirements-convert.txt          # torch, only ever needed here
python convert_to_onnx.py models/best_model.pt models/bone_age.onnx
```

```
torch=1.223963  onnx=1.223963  drift=3.00e-06
wrote models/bone_age.onnx
```

The script runs identical input through both runtimes and **refuses to write the file** if
they differ by more than `1e-4`. An export that silently diverges is the failure worth
guarding against.

Why ONNX at all: torch is 635 MB on disk and 374 MB resident, against 58 MB / 100 MB for
onnxruntime. Render's free instance has 512 MB total, shared with the API.

---

## 2. Verify against the real weights

```bash
cd backend
cp ../ai-service/models/bone_age.onnx models/
npm ci && npm run build && npm run verify:model
```

Exercises the whole chain — decode, resize, normalise, infer, denormalise:

```
  PASS  model loads
  PASS  result is a whole number of months
  PASS  result is inside 0-300 months
  PASS  sex input reaches the model — 175 vs 173
  PASS  provisional flag matches config
  PASS  a non-image is rejected
```

`sex input reaches the model` is the one people skip and should not: if the two numbers were
identical, the sex input is being ignored and the model is quietly worse for one sex, with no
error anywhere.

**With a labelled sample**, this becomes a real accuracy check rather than a plumbing check:

```bash
VERIFY_IMAGE=samples/known_120_months.png \
BONE_AGE_AGE_MEAN=<real> BONE_AGE_AGE_STD=<real> npm run verify:model
```

A known 120-month hand coming back near 120 confirms preprocessing, sex encoding **and**
denormalisation in one shot.

---

## 3. Publish the release

```bash
gh release create model-v2 \
  ai-service/models/bone_age.onnx \
  ai-service/models/best_model.pt \
  --title "Bone age model v2" \
  --notes "MAE X.XX months · MSE XXX · R² X.XXXX · within ±12 months XX.X%
Split: <train/val/test, dataset>
AGE_MEAN=<value>  AGE_STD=<value>   (or: still normalised, constants pending)
Changes from v1: <what changed>"
```

Publish **both** files. The `.pt` is the record of what was trained; the `.onnx` is what runs.

Weights are never committed — `.gitignore` blocks `*.pt`, `*.pth`, `*.onnx`. A 16 MB binary in
git is carried by every clone forever and gains a full extra copy per retrain.

Confirm the asset is publicly readable, since Render fetches it unauthenticated:

```bash
curl -sIL -o /dev/null -w '%{http_code}\n' \
  https://github.com/MONNNNNNNNNNN/project_stu5/releases/download/model-v2/bone_age.onnx
# 200
```

---

## 4. Bump the pointers and deploy

In `render.yaml` — the release tag in the build command, and the version string:

```yaml
buildCommand: >-
  ... curl -fsSL -o models/bone_age.onnx
  https://github.com/MONNNNNNNNNNN/project_stu5/releases/download/model-v2/bone_age.onnx
                                                              ^^^^^^^^
- key: BONE_AGE_MODEL_VERSION
  value: effnetb0-v2-rsna
```

And the measured numbers, which the UI shows to users:

```yaml
- key: BONE_AGE_MAE_MONTHS
  value: "8.78"
- key: BONE_AGE_ACCURACY_12M
  value: "0.731"
```

`curl -f` means a missing or renamed asset **fails the build** instead of deploying a service
with no model. That is deliberate.

```bash
git add render.yaml && git commit -m "Ship bone-age model v2" && git push
```

Render rebuilds on push, roughly 4 minutes. Watch it in the Render dashboard, or just poll:

```bash
until curl -s https://growth-backend-a479.onrender.com/health | grep -q '"ok"'; do sleep 10; done
```

`modelVersion` is stored on every prediction row, so results from an older model stay
interpretable after the swap. Old rows are **not** recomputed — a bone age is a reading of one
X-ray at one point in time, and silently rewriting history would be worse than a mixed table.

---

## 5. Test the deployed service

```bash
./scripts/smoke-bone-age.sh
```

Registers a throwaway account, uploads a hand X-ray, waits for the model to resolve it, checks
the radiograph route is still guardian-only, and **deletes everything it created**:

```
health... {"status":"ok","service":"growth-backend"}
register... ok
model-status... {"ready":true,"modelVersion":"effnetb0-v1-rsna","maeMonths":8.78,
                 "accuracyWithin12Months":0.731,"calibration":"provisional","detail":null}
create child... 8ec0c11a-7634-490f-92e4-fc38b668291f
upload... 8a4f645d-563d-40f5-8ee0-3688b4804795 (PENDING)
  poll 1: COMPLETED 175 effnetb0-v1-rsna (provisional calibration) None
PASS: bone age 175 months (14.6y)
PASS: image route 200 with token, 401 without
cleaned up smoke-1787216204-20286@example.invalid
```

Exit code 0 means the pipeline is live. Point it at a local backend with
`./scripts/smoke-bone-age.sh http://localhost:3001`.

Check the version string in the output is the one you just shipped — `effnetb0-v2-rsna`, not
v1. If it still says v1, Render served a cached build; redeploy with **Clear build cache**.

Then click through it once as a human at `grow-th.vercel.app/bone-age`, because the smoke test
does not look at the page: upload an X-ray, watch the row go *Analysing…* then resolve.

| Smoke test says | Means | Do this |
| --- | --- | --- |
| `model is not loaded on the server` | build did not fetch the asset | check the release is public and the tag in `render.yaml` matches |
| `inference failed — ... outside 0-300` | `AGE_MEAN`/`AGE_STD` are wrong for this checkpoint | see [calibration](#calibration--the-one-thing-still-outstanding) |
| `still PENDING after 60s` | model loaded but inference is hanging | check Render logs for an OOM kill |
| `image route is not guardian-checked` | authorisation regression | stop and fix before demoing — these are children's radiographs |

---

## Rolling back

The previous release is still there. Point `render.yaml` back at `model-v1` and push.

Faster, without a rebuild: set `BONE_AGE_MODEL_PATH` to a path that does not exist. The service
starts, `/bone-age/model-status` reports `ready: false`, uploads keep working, the UI says
"Bone age analysis is unavailable right now. Your image is still saved.", and rows read
"Saved — not analysed". Nothing errors — the app degrades instead of breaking.

---

## Calibration — the one thing still outstanding

The v1 checkpoint's training target was **normalised**: it emits ~2.4, not ~120. Months are
`raw * AGE_STD + AGE_MEAN`, and those constants did not arrive with the weights.

Current values are **inferred, not supplied**:

```
Var(y) = MSE / (1 - R²) = 135.91 / 0.0781  ->  SD ≈ 41.7 months
RSNA training mean                          ->     ≈ 127.3 months
```

So `BONE_AGE_CALIBRATION=provisional`, and every result carries that flag through the API into
a visible banner on the upload page. Once the ML team confirms the real values:

```yaml
- key: BONE_AGE_AGE_MEAN
  value: "<real>"
- key: BONE_AGE_AGE_STD
  value: "<real>"
- key: BONE_AGE_CALIBRATION
  value: confirmed        # banner disappears
```

Run step 2 and step 5 again after changing these. If a supplied `AGE_STD` lands far from ~41.7,
question it before shipping — the reported metrics imply it should be close if the target was
normalised by the dataset's own SD.

---

## The one thing that would settle everything

Four assumptions about v1 are still unconfirmed:

| Item | Assumed | Risk if wrong |
| --- | --- | --- |
| `AGE_MEAN` / `AGE_STD` | 127.3 / 41.7 (derived) | wrong scale — currently flagged provisional |
| Sex encoding | male = 1, female = 0 | quietly worse for one sex, no error |
| Input resolution | 224 × 224 | silently degraded accuracy |
| Normalisation | ImageNet mean/std | silently degraded accuracy |

**One labelled sample image** — a hand X-ray with its true bone age in months — settles all
four at once through step 2. It remains the single most useful thing the ML team can send, and
it is worth asking for by name every time a new checkpoint arrives.
