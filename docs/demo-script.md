# Demo walkthrough

Every feature, in an order that tells one story about one child. ~8 minutes.

Written for the deployed app. Read [`diagrams.md`](./diagrams.md) first if you want the
architecture picture behind it.

---

## Before you start

**Wake the backend.** The free Render instance sleeps after 15 minutes idle and takes about a
minute to come back. Opening the login page triggers a warm-up ping automatically, but do it
**five minutes before** you present, not during:

```bash
curl https://growth-backend-a479.onrender.com/health
# {"status":"ok","service":"growth-backend"}
```

**Have ready:** a hand X-ray image (JPEG or PNG, under 10 MB), and an account with one child
who already has 4–6 measurements. Creating that history live is slow and dull to watch.

**Know what you will say about calibration.** The bone-age figure is on provisional
calibration and the app says so in a banner. Do not skip past it — see
[the honest line](#the-honest-line) below.

---

## The run

### 1. Landing page — 30s
`/` signed out. The public page, the three articles.

Click an article, then **"← Back to home"**. It returns where you came from. Small thing, but
it used to always dump you on the Knowledge Center regardless of entry point.

### 2. Register — 1 min
`/register`. Fill it in. Point out the **terms checkbox is enforced server-side**, not just in
the form — FR-2. Try submitting without it.

Lands on **add child**: name, sex, date of birth, relationship, and a picked avatar rather
than a real photo, which is deliberate for a child's profile.

### 3. Dashboard — 1 min
The one-child view. Latest height, weight, BMI, each with its percentile. The growth chart
is framed on **the child's own age range**, not birth-to-20 — a two-year history squeezed into
a twenty-year axis is unreadable, which is what it used to do.

Switch the tabs — height, weight, BMI. The reference band moves with them.

### 4. Log a measurement — 1 min
`/growth`. Enter a height and weight.

The result comes back with a **plain-language line**, not just numbers: either "within the
typical range for the child's age and sex" or a flagged version that suggests seeing a
paediatrician. Say the word **screening**, not diagnosis — that framing runs through the whole
product.

Show the history table underneath, and that entries can be edited or deleted.

> **If asked "which growth reference is this?"** — currently CDC 2000, a US reference. Swapping
> to the Thai Department of Health charts is open and waiting on the files; it is a data
> change, not a code change. See [`research-checklist.md`](./research-checklist.md) §D1.

### 5. Puberty screening — 1.5 min
`/puberty`. Start the screening. The questions **branch on the child's sex** and follow the
TOR's Annex D categories.

Answer to produce an early-signs result. Show:
- the outcome in plain language, with the reason
- **next steps**, not just a verdict
- the **follow-up plan** — three rounds, four months apart, so a parent arrives at an
  appointment with dated observations instead of recollections

### 6. AI bone age — 2 min
`/bone-age`. This is the part that gets challenged, so lead with the answer.

**Say this first:** the app does not save you the hospital visit. It shortens the wait between
having the X-ray and knowing whether it matters. The realistic user already has a film, taken
at a hospital that has no one available to read it — which is the gap the TOR's own background
describes.

Upload the X-ray. Watch it go **PENDING → analysing → a result**, polled live. Then:

- bone age in **years and months**
- the **gap against the child's real age** — a bone age alone means very little
- the accuracy line: typical error about 9 months, and roughly **1 in 4 estimates out by more
  than a year**

### 7. Everything else — 1 min
- **Knowledge Center** `/learn` — search, category filter, an article
- **Children** `/children` — multiple children, switching, editing
- **Profile / Settings** — avatar upload, password change
- **Dark mode** — the toggle, top right. Charts recolour properly.
- **Mobile** — resize to a phone width. Bottom nav appears, the layout reflows.

---

## The honest line

The bone-age number is computed with **inferred** calibration constants. The model's training
target was normalised and the constants did not come with the weights, so they were derived
from the reported metrics. The app shows a **"Demo calibration"** banner saying exactly that.

Do not hide it, and do not read the number as clinically meaningful. If asked, the answer is
short: *"the model works and the pipeline is complete — one constant from the ML team turns
these into real months, and it is the last thing outstanding."*

Same principle applies to the accuracy figures. **MAE 8.78 months against the RSNA
challenge's ~4.2–4.5** is roughly twice the published leaders. Say so. TOR §13 asks for
performance to be documented transparently rather than overstated, and a reviewer who spots
you glossing over it will trust the rest of the demo less.

---

## If something breaks

| Symptom | Cause | What to do |
| --- | --- | --- |
| First request hangs ~1 min | cold start | expected — warm it beforehand |
| Login says "could not reach the server" | still waking | wait, retry; the app says this rather than "wrong password" on purpose |
| Bone age stays PENDING | model not loaded | uploads and history still work; skip to the next section |
| X-ray thumbnail missing | Render's disk is wiped on redeploy | a known gap; use a freshly uploaded image |
| 429 on repeated logins | rate limiter, 10/min | wait a minute — it is supposed to do that |

---

## Questions you should expect

**"What does the AI actually add if you still need a hospital?"**
See §6. Have the answer ready; it is the most likely question.

**"Is this a US growth reference for Thai children?"**
Yes, currently. Known, documented, waiting on the Thai files, and it is a data swap.

**"How do you update the model?"**
[`model-updates.md`](./model-updates.md) — convert, verify, release, bump two lines. About
four minutes end to end.

**"Why one service and not two?"**
Render bills 750 instance hours per workspace, not per service. Two always-waking services
halve the runway and chain two cold starts onto the first request.

**"What is not finished?"**
Calibration constants, the Thai growth reference, notifications having a producer, and
uploads surviving a redeploy. All tracked in
[`research-checklist.md`](./research-checklist.md).
