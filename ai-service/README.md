# Bone-age inference service

FastAPI wrapper around the trained EfficientNet-B0. Serves one endpoint the NestJS backend
calls; it holds no database and knows nothing about accounts or children.

Full contract, backend hook points and failure handling: **`../docs/ai-integration.md`**.

Status: scaffold. It runs, but `/predict` returns **503** until a checkpoint is in `models/`.

---

## Where the weights live — and why not in git

**The checkpoint is not committed.** `.gitignore` blocks `*.pt`, `*.pth`, `*.onnx`, `*.h5`,
`*.ckpt`, `*.safetensors` and everything in `models/`.

An EfficientNet-B0 checkpoint is roughly 20 MB of binary. Git stores every version forever
and cannot delta-compress it, so committing one means:

- every `git clone` downloads it, permanently, for everyone
- each retrain adds another full copy — five retrains is ~100 MB of history
- it can never be removed without rewriting history and breaking everyone's clone

`models/.gitkeep` exists purely to keep the folder in the tree as the agreed drop point.

**Distribute weights as a GitHub Release asset instead.** Releases are built for binaries,
are free, do not count against Git LFS quota, and are versioned in a way that maps onto
`MODEL_VERSION`:

```bash
# publishing (ML team, once per trained model)
gh release create model-v1 bone_age_effnetb0.pt \
  --title "Bone age model v1" \
  --notes "EfficientNet-B0, RSNA. Test MAE 6.4 months. Inputs: 224x224 RGB + sex."

# fetching (anyone running the service)
gh release download model-v1 --pattern '*.pt' --dir ai-service/models
```

Git LFS is the other option, but GitHub's free tier gives only 1 GB of storage and 1 GB of
bandwidth per month across the whole account, and going over it blocks pushes — for a handful
of checkpoints, Releases are the safer choice.

---

## Running it

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then fill in MODEL_VERSION and MAE_MONTHS
gh release download model-v1 --pattern '*.pt' --dir models

uvicorn main:app --port 8000
```

Check it before touching the app:

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","modelVersion":"effnetb0-v1-rsna","maeMonths":6.4,"detail":null}

curl -F "image=@sample_hand.png" -F "sex=MALE" http://127.0.0.1:8000/predict
```

Then point the backend at it — `backend/.env`:

```bash
BONE_AGE_SERVICE_URL="http://127.0.0.1:8000"
BONE_AGE_TIMEOUT_MS=30000
```

With `BONE_AGE_SERVICE_URL` unset the backend behaves exactly as it does today: uploads are
stored and listed, predictions stay `PENDING`, nothing errors. So a teammate without the
weights can still run the whole stack.

---

## Before this returns a real number

`main.py` carries five constants that the ML team has to confirm. Every one of them, if
guessed wrong, produces a **plausible-looking but incorrect** prediction with no error
anywhere:

| Constant | What it is | If wrong |
| --- | --- | --- |
| `IMG_SIZE` | training input resolution | silently degraded accuracy |
| `NORM_MEAN` / `NORM_STD` | preprocessing normalisation | silently degraded accuracy |
| `AGE_MEAN` / `AGE_STD` | target denormalisation, in months | the classic failure — model returns ~0.3, parent sees "0 months" |
| `SEX_MALE` / `SEX_FEMALE` | sex encoding, and which value is male | quietly worse for one sex |
| `MAE_MONTHS` | measured test-set error | the "±" shown to parents is fiction |

A bounds check refuses any prediction outside 0–300 months, so a missing denormalisation
fails loudly instead of reaching a parent as a confident wrong figure. That is a backstop,
not a substitute for confirming the values.

**Acceptance test:** ask for two or three sample images with their expected outputs. Without
known-good pairs you can confirm the service returns *a* number, not the *right* one.

Open questions are listed in `../docs/ai-integration.md` §11.

---

## Notes on the checkpoint format

`main.py` currently uses `torch.jit.load`, which expects a **TorchScript archive** and needs
no model class. If the handover is instead a bare `state_dict`, the ML team's `nn.Module`
definition has to be imported here and instantiated before `load_state_dict` — see the
comment in `_load_model`.

TorchScript is the easier handover: `torch.jit.script(model).save("bone_age_effnetb0.pt")`
on their side removes the need to keep an architecture file in sync across two repos.

---

## Privacy

The images crossing into this service are radiographs of children. Locally that is a
localhost hop. If this is ever deployed:

- keep it private — not a public URL or a public Hugging Face Space
- never log image bytes, never persist an upload; hold it in memory for the request only
- only the image and `MALE`/`FEMALE` are sent — no name, no date of birth, no identifiers,
  so this service cannot re-identify a child from what it receives. Keep it that way.
