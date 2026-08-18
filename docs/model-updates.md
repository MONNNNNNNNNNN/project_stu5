# Updating the bone-age model

Training continues, so this is the loop for shipping a retrain. It is deliberately short:
**convert, verify, release, bump.** No code changes, no redeploy of anything but a version
string.

---

## The loop

```
 train (ML team)
      │  best_model.pt
      ▼
 1. convert ──► bone_age.onnx        ai-service/convert_to_onnx.py
      ▼
 2. verify  ──► all checks pass      backend: npm run verify:model
      ▼
 3. release ──► model-vN asset       gh release create
      ▼
 4. bump    ──► render.yaml URL + MODEL_VERSION
      ▼
 auto-deploy on push
```

### 1. Convert

```bash
cd ai-service
pip install -r requirements-convert.txt          # torch, only needed here
python convert_to_onnx.py path/to/best_model.pt models/bone_age.onnx
```

`convert_to_onnx.py` runs the same input through torch and ONNX and **refuses to write the
file** if they differ by more than 1e-4. An export that silently diverges is the failure worth
guarding against.

⚠️ If the architecture changed — a different backbone, another input, a different head —
`model.py` must be updated first. The load is `strict=True`, so a mismatch fails loudly rather
than producing a half-random network.

### 2. Verify against the real weights

```bash
cd backend
cp ../ai-service/models/bone_age.onnx models/
npm run build && npm run verify:model
```

Checks the whole chain — decode, resize, normalise, infer, denormalise:

```
PASS  model loads
PASS  result is a whole number of months
PASS  result is inside 0-300 months
PASS  sex input reaches the model      — 175 vs 173
PASS  provisional flag matches config
PASS  a non-image is rejected
```

**If you have a labelled sample**, this is the moment to use it:

```bash
VERIFY_IMAGE=samples/known_120_months.png \
BONE_AGE_AGE_MEAN=... BONE_AGE_AGE_STD=... npm run verify:model
```

A known 120-month hand coming back near 120 confirms preprocessing, sex encoding and
denormalisation **all at once**. It is the single highest-value test available.

### 3. Publish the release

```bash
gh release create model-v2 ai-service/models/bone_age.onnx path/to/best_model.pt \
  --title "Bone age model v2" \
  --notes "MAE X.XX months · MSE X · R² X · within ±12 months XX%
Split: ...
AGE_MEAN=... AGE_STD=... (or: still normalised, constants pending)
Changes from v1: ..."
```

Publish **both** the `.onnx` and the original `.pt`. The `.pt` is the record of what was
trained; the `.onnx` is what runs.

Weights are never committed — `.gitignore` blocks `*.pt`, `*.pth`, `*.onnx`. A 16 MB binary in
git is carried by every clone forever and gains a full extra copy per retrain.

### 4. Bump the pointers

Two lines in `render.yaml`:

```yaml
buildCommand: >-
  ... curl -fsSL -o models/bone_age.onnx
  https://github.com/MONNNNNNNNNNN/project_stu5/releases/download/model-v2/bone_age.onnx
                                                              ^^^^^^^^
- key: BONE_AGE_MODEL_VERSION
  value: effnetb0-v2-rsna
```

And the measured numbers, if they moved:

```yaml
- key: BONE_AGE_MAE_MONTHS
  value: "8.78"
- key: BONE_AGE_ACCURACY_12M
  value: "0.731"
```

Push. Render rebuilds, fetches the new asset, restarts. **Roughly 4 minutes.**

`modelVersion` is stored on every prediction row, so results made by an older model stay
interpretable after the swap. Old rows are **not** recomputed — a bone age is a reading of an
X-ray at a point in time, and silently rewriting history would be worse than a mixed table.

---

## Rolling back

The previous release is still there:

```bash
# point render.yaml back at model-v1, push
```

Or, faster, without a deploy: set `BONE_AGE_MODEL_PATH` to a path that does not exist. The
service starts, `/bone-age/model-status` reports `ready: false`, uploads keep working, and
predictions stay `PENDING`. Nothing errors — the app degrades instead of breaking.

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
a visible banner on the upload page. **Once the ML team confirms the real values:**

```yaml
- key: BONE_AGE_AGE_MEAN
  value: "<real>"
- key: BONE_AGE_AGE_STD
  value: "<real>"
- key: BONE_AGE_CALIBRATION
  value: confirmed        # banner disappears
```

If a supplied `AGE_STD` lands far from ~41.7, that is worth a second look before shipping —
the metrics imply it should be close if the target was normalised by the dataset's own SD.

---

## Still unconfirmed about v1

| Item | Assumed | Risk if wrong |
| --- | --- | --- |
| `AGE_MEAN` / `AGE_STD` | 127.3 / 41.7 (derived) | wrong scale — flagged provisional |
| Sex encoding | male = 1, female = 0 | quietly worse for one sex, no error |
| Input resolution | 224 × 224 | silently degraded accuracy |
| Normalisation | ImageNet mean/std | silently degraded accuracy |

All four are settled by **one labelled sample image**. That remains the single most useful
thing the ML team can send.
