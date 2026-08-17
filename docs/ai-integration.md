# AI Bone Age — Integration Contract

How the EfficientNet-B0 bone age model gets from the ML team's notebook into GrowTH.

Covers TOR **FR-17**, **FR-18**, **FR-19**, **§3.4**, **§6.3**, deliverable **D4**.

**Status:** contract agreed, service scaffolded, backend not yet wired.

- `ai-service/` exists and runs — see `ai-service/README.md`. `/predict` answers **503**
  until a checkpoint is dropped into `ai-service/models/`, so the stack runs without it.
- Checkpoints are **not** committed. `.gitignore` blocks `*.pt`/`*.pth`/`*.onnx` and
  `ai-service/models/*`; weights are distributed as GitHub Release assets. Reasoning is in
  the service README.
- `BoneAgeService.predict()` still throws `NotImplementedException` on purpose — it does not
  fabricate a number. Section 4 below is the backend change that replaces it.

---

## 1. Decisions taken

| Question | Decision | Consequence |
| --- | --- | --- |
| Export format | **PyTorch `.pt` / `.pth` weights** | Inference needs a Python process. Node cannot load these directly, so a sidecar service is required — this is the single biggest driver of the design below. |
| Where inference runs | **Locally for now**, cloud later | Backend talks to the model over HTTP at a configurable URL. Local dev points it at `127.0.0.1:8000`; moving to cloud is a change of env var, not of code. See §7. |
| Model inputs | **Image + sex** | Two-input signature. The backend already holds `child.sex`, so nothing new needs collecting. |
| Result delivery | **Async — `PENDING`, then poll** | Upload returns immediately. Matches the `BoneAgePredictionStatus` enum already in the schema. Survives a slow first inference without the browser timing out. |

---

## 2. What the ML team must hand over

A weights file on its own is **not** enough to reproduce a prediction. Every item below is
required; the ones marked ⚠ are the ones that silently produce plausible-but-wrong numbers
when they are missing or guessed.

| # | Item | Why |
| --- | --- | --- |
| 1 | `bone_age_effnetb0.pt` — weights (`state_dict` or TorchScript; say which) | the model |
| 2 | The `nn.Module` class definition, or a TorchScript archive that needs no class | a bare `state_dict` cannot be loaded without the matching architecture |
| 3 | Input image size and channel count (e.g. `224×224`, 3-channel RGB or 1-channel grey repeated to 3) | wrong size → wrong answer, no error |
| 4 | ⚠ **Exact preprocessing**: resize/crop method, and the normalization `mean`/`std` used in training | ImageNet defaults (`[0.485,0.456,0.406]`/`[0.229,0.224,0.225]`) are common but must be **confirmed**, not assumed |
| 5 | ⚠ **Target denormalization constants** — if the age target was normalized during training (`(age − mean) / std`), we need that `mean` and `std` | the classic RSNA integration bug: the model returns ~`0.3`, gets reported as "0 months", and looks like a broken model rather than an un-denormalized output |
| 6 | ⚠ **Sex encoding** — which value means male: `0`/`1`, or `-1`/`1`? And is it concatenated to the CNN features or fed through its own dense branch? | a flipped encoding degrades accuracy quietly; it will not crash |
| 7 | Output units — months (expected) or years | |
| 8 | Whether the model emits any uncertainty (MC-dropout, ensemble spread) | decides whether `confidenceScore` is real or stays `null` — see §6 |
| 9 | **MAE in months on the held-out test set** + the train/val/test split description | TOR §6.3 requires it; FR-18 needs it to state a margin of error |
| 10 | A version string, e.g. `effnetb0-v1.2-rsna` | stored per prediction in `modelVersion` so old results stay interpretable after a retrain |
| 11 | 2–3 sample images with their expected outputs | the only way to prove the service is wired up correctly rather than merely running |

> Item 11 is the acceptance test. Without known-good input/output pairs we can confirm the
> service returns *a* number, but not that it returns the *right* one.

---

## 3. Inference service — API contract

A small FastAPI app that owns the model. It knows nothing about GrowTH: no database, no
auth, no children. It takes an image and a sex, and returns a number.

### `GET /health`

```json
{ "status": "ok", "modelVersion": "effnetb0-v1.2-rsna", "maeMonths": 6.4 }
```

Used by the backend to decide whether the feature is available at all, and to source the
margin of error shown in the UI for FR-18.

### `POST /predict`

`multipart/form-data`

| Field | Type | Notes |
| --- | --- | --- |
| `image` | file | JPEG or PNG, ≤10 MB — same limits the upload endpoint enforces |
| `sex` | string | `MALE` or `FEMALE`. **Spelled out, not 0/1** — the mapping to the model's own encoding is the service's job, so a flip can only ever be wrong in one place |

**200 OK**

```json
{
  "boneAgeMonths": 138.4,
  "confidence": 0.82,
  "modelVersion": "effnetb0-v1.2-rsna",
  "inferenceMs": 412
}
```

- `boneAgeMonths` — float, already denormalized to real months.
- `confidence` — `0.0`–`1.0`, or **`null`** if the model does not produce a genuine
  uncertainty estimate. Do not synthesize one. See §6.

**422** — image unreadable/corrupt. **503** — model failed to load at boot.

```json
{ "error": "unreadable_image", "message": "Could not decode the uploaded file as an image." }
```

### Reference implementation sketch

```python
# ai-service/main.py
import io, time, os
import torch
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from PIL import Image
from torchvision import transforms

MODEL_VERSION = os.getenv("MODEL_VERSION", "effnetb0-v1.2-rsna")
MAE_MONTHS = float(os.getenv("MAE_MONTHS", "0"))

# ⚠ Items 4 and 5 from §2 — replace with the values the ML team actually trained with.
IMG_SIZE = 224
NORM_MEAN, NORM_STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
AGE_MEAN, AGE_STD = 127.3, 41.2   # months; set both to (0, 1) if the target was not normalized

app = FastAPI()
device = torch.device("cpu")
model = torch.jit.load("bone_age_effnetb0.pt", map_location=device).eval()

prep = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(NORM_MEAN, NORM_STD),
])

@app.get("/health")
def health():
    return {"status": "ok", "modelVersion": MODEL_VERSION, "maeMonths": MAE_MONTHS}

@app.post("/predict")
async def predict(image: UploadFile = File(...), sex: str = Form(...)):
    if sex not in ("MALE", "FEMALE"):
        raise HTTPException(422, "sex must be MALE or FEMALE")
    try:
        img = Image.open(io.BytesIO(await image.read())).convert("RGB")
    except Exception:
        raise HTTPException(422, "Could not decode the uploaded file as an image.")

    started = time.time()
    x = prep(img).unsqueeze(0).to(device)
    # ⚠ Item 6 — confirm the encoding before trusting any output.
    s = torch.tensor([[1.0 if sex == "MALE" else 0.0]], device=device)

    with torch.no_grad():
        raw = model(x, s).squeeze().item()

    return {
        "boneAgeMonths": raw * AGE_STD + AGE_MEAN,   # ⚠ item 5
        "confidence": None,
        "modelVersion": MODEL_VERSION,
        "inferenceMs": int((time.time() - started) * 1000),
    }
```

---

## 4. Where it hooks into the backend

Three files change. Everything else — upload, guardian checks, history, the image route —
already works and is untouched.

### 4.1 New: `backend/src/bone-age/bone-age.client.ts`

Thin HTTP client. Owns the timeout and the "is the model even configured" question.

```ts
@Injectable()
export class BoneAgeClient {
  constructor(private config: ConfigService) {}

  get isConfigured() {
    return !!this.config.get<string>('BONE_AGE_SERVICE_URL');
  }

  async predict(filePath: string, sex: 'MALE' | 'FEMALE'): Promise<BoneAgeResult> {
    const base = this.config.getOrThrow<string>('BONE_AGE_SERVICE_URL');
    const form = new FormData();
    form.append('image', new Blob([await readFile(filePath)]));
    form.append('sex', sex);

    const res = await fetch(`${base}/predict`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(Number(this.config.get('BONE_AGE_TIMEOUT_MS') ?? 30_000)),
    });
    if (!res.ok) throw new Error(`Inference service returned ${res.status}`);
    return res.json() as Promise<BoneAgeResult>;
  }
}
```

### 4.2 Changed: `bone-age.service.ts`

`upload()` keeps returning a `PENDING` row immediately, then kicks off inference without
awaiting it. `predict()` — currently the `NotImplementedException` at line 29 — is deleted;
nothing calls it once the flow is async.

```ts
async upload(userId: string, childId: string, imageUrl: string) {
  await this.childrenService.assertGuardianAccess(childId, userId);
  const prediction = await this.prisma.boneAgePrediction.create({ data: { childId, imageUrl } });

  // Deliberately not awaited: the client gets its PENDING row now and polls. A rejection
  // here can never surface as an unhandled rejection because runInference catches its own.
  void this.runInference(prediction.id);
  return prediction;
}

/** Resolves a PENDING row to COMPLETED or FAILED. Never throws — nothing awaits it. */
private async runInference(id: string) {
  const prediction = await this.prisma.boneAgePrediction.findUniqueOrThrow({
    where: { id }, include: { child: true },
  });
  try {
    const out = await this.client.predict(
      join(process.cwd(), 'uploads', 'bone-age', basename(prediction.imageUrl)),
      prediction.child.sex,
    );
    await this.prisma.boneAgePrediction.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        predictedAgeMonths: Math.round(out.boneAgeMonths),
        confidenceScore: out.confidence ?? null,
        modelVersion: out.modelVersion,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    this.logger.error(`Bone age inference failed for ${id}`, err as Error);
    await this.prisma.boneAgePrediction.update({
      where: { id },
      data: { status: 'FAILED', completedAt: new Date(), failureReason: describe(err) },
    });
  }
}
```

### 4.3 Changed: `bone-age.module.ts`

Register `BoneAgeClient` as a provider.

### 4.4 Frontend: `BoneAgeUpload.tsx`

Poll while anything is `PENDING`, and stop as soon as nothing is:

```ts
const { data: history } = useQuery({
  queryKey: ['bone-age-history', selectedChildId],
  queryFn: async () => (await api.get<BoneAgePrediction[]>('/bone-age/history', {
    params: { childId: selectedChildId },
  })).data,
  enabled: !!selectedChildId,
  // Poll only while something is actually in flight — otherwise this is a permanent
  // background request loop against a free-tier backend.
  refetchInterval: (q) => (q.state.data?.some((p) => p.status === 'PENDING') ? 3000 : false),
});
```

The result block already handles all three states; it currently only ever sees `PENDING`.

---

## 5. Lifecycle

```
POST /bone-age/upload                    (multipart, guardian-checked)
  └─> row created  status=PENDING  ──> 201 returned to client immediately
        │
        │  background, not awaited
        ├─> POST {BONE_AGE_SERVICE_URL}/predict   { image, sex }
        │      ├─ 200 ─> status=COMPLETED, predictedAgeMonths, confidenceScore, modelVersion
        │      ├─ 4xx ─> status=FAILED, failureReason="unreadable_image"
        │      └─ timeout / unreachable ─> status=FAILED, failureReason="service_unavailable"
        ▼
GET /bone-age/history?childId=…          (client polls every 3s while any row is PENDING)
GET /bone-age/:id/image                  (guardian-checked stream — already implemented)
```

---

## 6. Schema changes needed

The existing `BoneAgePrediction` model covers most of this. Three gaps:

| Field | Issue | Proposal |
| --- | --- | --- |
| `predictedAgeMonths Int?` | model returns a float; `Int` silently rounds | acceptable — months are the reported unit and FR-18 pairs the figure with a ±MAE margin far larger than the rounding. Keep `Int`, round explicitly. |
| `confidenceScore Decimal(4,3)?` | a plain regression head has **no** calibrated confidence | leave `null` unless the model genuinely produces uncertainty. **Do not display a fabricated confidence on a medical screen.** If it is null, the UI shows the MAE margin instead and no percentage. |
| *(missing)* `failureReason String?` | `FAILED` currently carries no explanation, so the UI can only say "try again" | **add it** — a new migration. Distinguishing "that image was unreadable" from "the model is offline" is the difference between an actionable message and a dead end. |

Migration:

```sql
ALTER TABLE "bone_age_predictions" ADD COLUMN "failureReason" TEXT;
```

---

## 7. Running it — local now, cloud later

### Local (the current decision)

Three processes. The model service and the backend must both be on the same machine,
because `BONE_AGE_SERVICE_URL` points at localhost and the backend reads the uploaded file
off its own disk.

```bash
# 1. inference service
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn torch torchvision pillow python-multipart
uvicorn main:app --port 8000

# 2. backend  (backend/.env)
#    BONE_AGE_SERVICE_URL="http://127.0.0.1:8000"
#    BONE_AGE_TIMEOUT_MS=30000
cd backend && npm run start:dev

# 3. frontend
cd frontend && npm run dev
```

Check the wiring before touching the app:

```bash
curl http://127.0.0.1:8000/health
curl -F "image=@sample_hand.png" -F "sex=MALE" http://127.0.0.1:8000/predict
```

If `BONE_AGE_SERVICE_URL` is unset the backend keeps working — uploads still store and
display, predictions stay `PENDING`, and nothing 500s. That is the same degrade-gracefully
pattern `MailService` already uses, and it means a teammate without the weights can still
run the app.

### Going to cloud later

The code does not change; the env var does. Options, honestly costed:

| Option | Cost | Cold start | Trade-off |
| --- | --- | --- | --- |
| **Render / Railway free Python service** | free | 30–60 s after 15 min idle, **on top of** the backend's own cold start | simplest, but the first upload of the day can take a minute. Async polling is what makes this tolerable — the request never times out, the row just stays `PENDING` a while. |
| **Hugging Face Spaces** (free CPU) | free | ~30 s | built for exactly this; public by default, so use a private Space and a token |
| **Keep it local, demo only** | free | none | fine for the November 2 demo if the laptop runs it; **not** a deployed system, so §6.1's "accessible via a stable URL" is only partly met |

⚠ One thing that **must** change for cloud: the backend currently reads the image from its
own local disk (`uploads/bone-age/…`). Split across two hosts that path does not exist on
the model service, and Render's disk is ephemeral anyway. Either forward the bytes in the
request (the design above already does this — the backend reads the file and posts it), or
move uploads to object storage first. The design above works across hosts as written; it is
the *file still existing* that is the risk, which is the already-documented ephemeral-disk
problem.

### Env vars to add

```bash
# backend/.env.example
BONE_AGE_SERVICE_URL=          # unset = feature degrades to PENDING-forever, no crash
BONE_AGE_TIMEOUT_MS=30000
```

---

## 8. What the UI must say (FR-18, §6.3)

TOR §6.3 requires the screening-aid framing **in the interface**, not only in the docs.
`BoneAgeUpload.tsx` already carries the disclaimer. When a real number arrives it needs:

- the estimate in **years and months** ("11 years 6 months"), not raw months
- the **margin**: "±6.4 months" sourced from `/health`'s `maeMonths`, labelled as the
  model's mean absolute error on held-out test data
- the child's **chronological** age next to it — a bone age means nothing alone; the
  clinically interesting quantity is the gap between the two
- confidence **only if genuinely produced** (§6)
- the existing "screening aid, not a diagnosis — consult a pediatric endocrinologist" line

Suggested wording:

> Estimated bone age: **11 y 6 m** (±6 months)
> Chronological age: 10 y 4 m — about 14 months ahead
> This is an automated screening aid, not a diagnosis. Only a doctor can interpret what this
> means for your child.

---

## 9. Failure modes

| Failure | Behaviour | Surfaced as |
| --- | --- | --- |
| `BONE_AGE_SERVICE_URL` unset | no inference attempted, row stays `PENDING` | "Awaiting AI model integration" (current copy) |
| Service down / unreachable | `FAILED`, `failureReason="service_unavailable"` | "Analysis is temporarily unavailable — your image was saved, try again later." |
| Image unreadable (422) | `FAILED`, `failureReason="unreadable_image"` | "That image could not be read. Try re-exporting the X-ray as JPEG or PNG." |
| Inference exceeds timeout | `FAILED`, `failureReason="timeout"` | same as unavailable; raise `BONE_AGE_TIMEOUT_MS` if it recurs on cold starts |
| Upload file missing from disk | `FAILED`, `failureReason="image_missing"` | the ephemeral-disk problem; the honest message is that the image was lost, not that the model failed |
| Model returns NaN / absurd value | reject outside 0–300 months, mark `FAILED` | guards against a missing denormalization (§2 item 5) reaching a parent as "0 months" |

That last row matters: a bounds check is the cheapest defence against the most likely
integration error, and it fails loudly instead of showing a confident wrong number.

---

## 10. Privacy (§6.2, PDPA)

- X-rays already stream through a guardian-checked route; they are **not** public files.
- Sending an image to the inference service means it crosses a process boundary. Locally
  that is localhost. **In cloud it leaves the host** — so the model service must be private
  (not a public Space/URL), must not log image bytes, and must not persist uploads. It
  should hold the image in memory for the duration of the request only.
- Only the image and `MALE`/`FEMALE` are sent. No name, no date of birth, no identifiers —
  the service cannot re-identify a child from what it receives. Keep it that way.
- The model service needs **no** database access.

---

## 11. Open questions for the ML team

1. TorchScript archive or bare `state_dict`? If the latter, send the `nn.Module` class.
2. Was the age target normalized in training? If yes — the exact `mean`/`std`.
3. Sex encoding: which value is male, and where does it enter the network?
4. Does the model produce any real uncertainty, or should `confidenceScore` stay null?
5. Final MAE in months on the held-out test set, and the split description (§6.3, D4).
6. Model size on disk — decides whether a 512 MB free instance is viable.
7. Two or three sample images with expected outputs, for the acceptance check.
