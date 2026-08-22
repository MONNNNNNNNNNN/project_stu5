# Where the height, weight and BMI numbers come from

Every percentile, SDS and weight-status label the app shows a parent traces back to one of the
files below. This document exists so that claim is checkable rather than asserted — the
provenance in this repo was wrong once already, describing the infant tables as WHO when they
are CDC.

**Verify it yourself:**

```bash
cd backend && npm run reference:check
```

That regenerates every table from cdc.gov and fails if the committed files disagree. It also
re-derives CDC's own published percentile columns from the parameters and checks they match.

---

## The tables

All CDC, United States. See [the decision](#why-a-us-reference) for why.

| What the app computes | File | CDC source | Span |
| --- | --- | --- | --- |
| Weight-for-age, infants | `weight-infant.json` | [`wtageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtageinf.csv) | 0–36 mo |
| Length-for-age, infants | `height-infant.json` | [`lenageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/lenageinf.csv) | 0–35.5 mo |
| Weight-for-age, children | `weight-child.json` | [`wtage.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv) | 24–240 mo |
| Stature-for-age, children | `height-child.json` | [`statage.csv`](https://www.cdc.gov/growthcharts/data/zscore/statage.csv) | 24–240 mo |
| BMI-for-age | `bmi-child.json` | [`bmi-age-2022.csv`](https://www.cdc.gov/growthcharts/data/extended-bmi/bmi-age-2022.csv) | 24–240.5 mo |
| Weight-for-length *(not yet used)* | `weight-for-length.json` | [`wtleninf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtleninf.csv) | 45–103.5 cm |

They live in `backend/src/growth/reference-data/`. The original Excel workbooks, as downloaded
from [CDC's data files page](https://www.cdc.gov/growthcharts/cdc-data-files.htm), are archived
in `data-knowledge/Chart/` — those carry CDC's own authorship metadata and are the primary
record; the CSVs above are the same data in a machine-readable form.

**Checked 2026-08-22:** all six verify byte-exact against their CDC source. Zero difference in
L, M or S anywhere.

## The maths

Each row is an LMS triple — Box-Cox power (L), median (M), coefficient of variation (S):

```
Z = ((x/M)^L − 1) / (L·S)     when L ≠ 0
Z = ln(x/M) / S               when L = 0
percentile = Φ(Z) × 100
```

Values between table rows are linearly interpolated on L, M and S. Implementation:
`backend/src/growth/growth-reference.service.ts`.

### Above the 95th percentile, BMI is different

The LMS formula has a hard ceiling wherever L is negative, which for BMI it is at every age:
z can never exceed `−1/(L·S)`. For a ten-year-old boy that ceiling is **3.0096**, so a BMI of
35 and a BMI of 60 came out a quarter of a percentile point apart.

CDC's December 2022 extended charts keep the same L/M/S below the 95th percentile and splice a
half-normal onto the tail above it:

```
P(bmi) = 100 × (0.95 + 0.05 × (2Φ((bmi − P95)/σ) − 1))     for bmi ≥ P95
```

`σ` is the only genuinely new number — the L, M and S in the 2022 file are **bit-identical** to
CDC 2000's `bmiagerev.csv`, which the build script asserts on every run.

| | Before | After |
| --- | --- | --- |
| boy 10y, BMI 35 | 99.57th | **99.97th**, 158% of P95 |
| boy 10y, BMI 60 | 99.83rd | **100th**, 271% of P95 |

## The categories

| Label | Rule |
| --- | --- |
| Underweight | below the 5th percentile |
| Healthy weight | 5th to below the 85th |
| Overweight | 85th to below the 95th |
| Obesity | 95th and above |
| Severe obesity | ≥ 120% of the 95th percentile, **or** BMI ≥ 35, whichever comes first |

Source: CDC, "Defining Child BMI Categories", with the 2022 extended percentiles. Checked
2026-08-21.

Severity above the 95th is driven by **percent of P95, not by a percentile**, because 120% of
P95 lands on the 99.98th percentile at age two and the 98.05th at age twenty. A fixed
percentile cut-point would be wrong by nearly two percentile points across the range this app
covers.

The `BMI ≥ 35` clause is load-bearing: at twenty years a BMI of 35 is the 97.32nd percentile,
*below* 120% of P95, and tall older adolescents are exactly who it catches.

BMI-for-age only applies from **5 years** (FR-8). Below that the app shows height and weight
percentiles and no weight-status label at all — see [the gap](#what-is-missing).

## Chart bands

The dashboard and Growth charts shade these zones so a parent can see where a child sits
without decoding a number. BMI charts show P5 / P85 / P95 / 120%-of-P95; height and weight show
P3 / P50 / P97. Every band is read from the same LMS row the label is computed from, so a
shaded zone and the text under it cannot disagree.

BMI charts deliberately omit P97: it has no clinical reading, and at ten years it sits about
1.2 BMI units from P95 — two near-identical dashed lines, neither of which is the one a
clinician looks for.

---

## Why a US reference

**Decision, 2026-08-21.** The bone-age model is trained on the RSNA 2017 challenge set
(Stanford and the University of Colorado, US paediatric). Keeping the growth reference American
means growth charts, puberty thresholds and the AI all quote one baseline population instead of
three.

**The honest cost.** CDC 2000 is built on NHANES measurements taken between **1963 and 1994**.
It is applied here to Thai children, who are not that population and were not measured in that
era. A Thai child's percentile can land noticeably away from where a Thai paediatrician would
place them, and FR-10's ±2 SD flag inherits that. Thailand's Department of Health publishes its
own charts, which is what KhunLook uses.

Skeletal maturation is less ethnicity-sensitive than height, weight and BMI, so the consistency
argument is genuinely stronger for the bone-age model than for the growth charts. Recorded as a
trade-off, not resolved.

**The era gap cannot be closed.** CDC never reissued height or weight-for-age —
`statage-2022.csv` and `wtage-2022.csv` both return 404. CDC 2000 is still the current US
standard. The 2022 update exists for BMI only, and is in.

⚠️ **TOR §2A.2 requires the Client Representative to confirm the reference dataset, and that has
never happened.** Bring this as a decision to ratify — `client-questions.md` Q1.

## What is missing

- **No weight status under 5 years.** BMI-for-age starts at 60 months, so a parent logging a
  two-year-old gets percentiles and no verdict. `weight-for-length.json` is committed and
  verified but unused, because its category cut-points are unsettled — CDC points at WHO for
  under-twos and the bands differ from BMI's 5/85/95. Sourcing those unblocks it.
- **CDC recommends WHO for 0–2 years**, CDC 2000 for 2–20. Using CDC 2000 below 24 months
  departs from CDC's own guidance. Kept for consistency with the decision above; if that is
  ever revisited, CDC publishes a WHO-based set.
- **±2 SD as the "notable" flag** is still uncited (`research-checklist.md` D2).
- **Length vs stature.** Below 24 months CDC expects recumbent length; at and above, standing
  stature. They differ by roughly 0.7 cm for the same child, and the form asks only for
  "Height (cm)".
