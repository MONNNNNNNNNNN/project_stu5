# When to measure what

What a parent should record, at what age, and what triggers the next step. This is the
clinical timeline behind the suggestion rules in
[`product-flow.md`](./product-flow.md) — that document says how the features connect, this one
says *when*.

> ⚠️ **Read the citation status before using this with the client.** The app's own rule is that
> every clinical number shown to a parent cites a source. Rows below marked 🔴 do not yet, and
> the team should not present them as clinical guidance until they do —
> [`research-checklist.md`](./research-checklist.md) tracks them.

---

## The timeline

Visit ages, and which measurements are taken at each, are the Bright Futures / AAP
periodicity schedule (4th ed.) — read from the schedule itself and counted, not paraphrased:

| Measurement | AAP range |
| --- | --- |
| Length/height and weight | Newborn → 21 y |
| Head circumference | Newborn → **24 mo** |
| Weight-for-length | Newborn → **18 mo** |
| BMI | **24 mo** → 21 y |

Visits: 3–5 days, then 1, 2, 4, 6, 9, 12, 15, 18, 24 and 30 months, then annually to 21 years.

| Age | Height & weight | Head circumference | BMI | Puberty screening | Bone age |
| --- | --- | --- | --- | --- | --- |
| 0–18 mo | every visit | ✅ every visit | — | — | — |
| 18–24 mo | every visit | ✅ | — | — | — |
| 2–6 y | every 6–12 months | — *(to 36 mo in-app)* | ✅ from 24 mo | — | — |
| 6 y onward | every 6–12 months | — | ✅ | ✅ offered from age 6 | only if referred |
| Flagged | every 4 months | — | ✅ | ✅ every 4 months, 3 rounds | if screening flags early signs |

### Height and weight — from birth, throughout

The two measurements everything else is built on. A single height is nearly meaningless; the
**trend** is the signal, which is why the app frames the chart on the child's own age range
rather than birth-to-20.

- **What the app does:** computes percentile and SDS against CDC 2000 on every entry, and
  flags anything beyond ±2 SD (FR-10).
- 🔴 The ±2 SD threshold is uncited (D2).

### BMI — from 2 years

- **Why 2:** CDC's BMI-for-age table starts at 24 months and the AAP schedule measures BMI from
  24 months to 21 years. 🟢 Cited.
- The app used to start at 60 months per FR-8, discarding three years of valid data. Changed
  2026-08-23. ⚠️ That is a deviation from a numbered requirement — see
  [`tor-compliance.md`](./tor-compliance.md).
- **Below 2 years:** head circumference is now tracked instead, which is what the AAP schedule
  measures in that window. Weight-for-length remains unused pending category cut-points.
- **What the app does:** classifies into CDC's five categories and shades them on the chart.
  🟢 Cited — CDC, "Defining Child BMI Categories" + 2022 extended percentiles.

### Puberty screening — offered from age 6

- **Why 6:** precocious puberty is defined as onset before **8 in girls, 9 in boys** 🟢
  ([Latronico, Brito & Carel, *Lancet Diabetes Endocrinol* 2016, PMID 26852255](https://pubmed.ncbi.nlm.nih.gov/26852255/)).
  Gating the questionnaire *at* those ages would mean never prompting before the age that
  defines "early" — precisely the case it exists to catch. Central precocious puberty is rarely
  seen below about six.
- ⚠️ **The age gate is provisional.** The client asked for one but the specific age was not
  captured — `client-questions.md` Q7a. It is a single constant in
  `backend/src/suggestions/suggestions.service.ts`.
- **Delayed thresholds** — no breast development by 13, no menarche by 15, no testicular
  enlargement by 14. 🔴 **Uncited.** Conventional figures, but no source found. Do not present
  these as guideline-backed.
- **What the app does:** asks yes / no / **not sure** per sign. "Not sure" on the sign that
  would decide a delayed outcome returns *"not enough information"*, not a delayed flag.

### Bone age — only when there is already an X-ray

- **The app cannot order an X-ray**, and does not shorten the path to getting one. It reads a
  film the parent already has, which is the gap TOR §1 describes: many facilities have no one
  available to interpret one.
- **Triggered by:** a screening returning early signs, or a doctor asking for it.
- **Accuracy:** MAE **8.78 months**, and roughly **one estimate in four** is out by more than a
  year. Currently on provisional calibration.
- 🔴 The 2-year gap the app treats as notable is uncited (D3) — and it is only about two of the
  model's own average errors wide, which is why the copy says "worth asking about" rather than
  stating anything.

---

## What triggers what

Implemented in `backend/src/suggestions/suggestions.service.ts`, surfaced as the dashboard's
"What to do next" panel. All **suggestions**, never blocks.

```
  log height / weight
          │
          ▼
   BMI outside healthy range?  ──no──►  keep tracking
          │ yes
          ▼
   child aged 6 or over?  ──no──►  keep tracking, re-check next visit
          │ yes
          ▼
   suggest puberty screening
          │
          ▼
   EARLY_SIGNS? ──no──► follow the outcome's own guidance
          │ yes
          ▼
   see a doctor  +  4-month follow-up ×3  +  suggest uploading an X-ray
          │
          ▼
   bone age ≥ 2 years ahead? ──yes──► surface on the growth chart, suggest referral
```

**Why BMI is the entry point:** it is what the client described. An earlier draft used
height/weight SDS, which was the team's guess before confirming.

🔴 **The BMI-to-puberty-timing link is uncited.** Higher adiposity is associated with earlier
onset (particularly in girls) and low weight with later onset, but this repo has no source for
it — and it is the entire clinical justification for the first trigger. Team item, D2. Until it
is cited, the copy claims only that the two are *worth looking at together*.

**Why the follow-up is 4 months, 3 rounds:** what distinguishes rapidly-progressive puberty
from the slowly-progressive kind is whether signs keep advancing, which needs repeat
observation. 🔴 Uncited (D2).

---

## Citation status, at a glance

| Item | Status |
| --- | --- |
| BMI categories | 🟢 CDC, checked 2026-08-21 |
| Growth reference (CDC 2000 + 2022 extended BMI) | 🟢 verified byte-exact, `npm run reference:check` |
| Precocious puberty ages (8 / 9) | 🟢 PMID 26852255 |
| Delayed puberty ages (13 / 15 / 14) | 🔴 no source found |
| ±2 SD growth flag | 🔴 |
| BMI-for-age minimum age (2 y) | 🟢 CDC table + AAP schedule, checked 2026-08-23 |
| Head circumference window (birth–24 mo) | 🟢 AAP periodicity schedule |
| Measurement frequency and visit ages | 🟢 AAP periodicity schedule, 4th ed. |
| Follow-up interval (4 mo × 3) | 🔴 |
| Bone-age gap threshold (2 y) | 🔴 |
| BMI ↔ puberty onset link | 🔴 |
| Weight-for-length categories | 🔴 blocks that table being used |
| Puberty screening age gate (6) | ⚪ client decision, Q7a |

**Six** are open, down from nine — the AAP periodicity schedule closed the frequency and
age-range rows, and CDC closed the BMI minimum age. The rest is the honest state, and it is why
this file leads with a warning rather than reading like clinical advice.

Full register, including the AI model's unverified assumptions:
[`sources-register.md`](./sources-register.md).
