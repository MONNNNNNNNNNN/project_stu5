# Growth reference data

LMS (Box-Cox power / median / coefficient-of-variation) parameter tables used to compute
height/weight/BMI-for-age percentiles and SDS (z-scores), per TOR FR-7/FR-8.

Each row: `{ sex: 1 (male) | 2 (female), ageMonths, L, M, S }`. BMI rows carry a sixth key,
`sigma`; weight-for-length is indexed on `lengthCm` rather than `ageMonths`.

```
Z = ((x/M)^L − 1) / (L·S)   when L ≠ 0
Z = ln(x/M) / S             when L = 0
percentile = Φ(Z) × 100
```

Above the 95th percentile, BMI uses CDC's 2022 extended method instead — see
[Above the 95th percentile](#above-the-95th-percentile).

## Do not edit these by hand

```bash
npm run reference:build     # regenerate every table from cdc.gov
npm run reference:check     # rebuild in memory, fail if the committed files disagree
```

`scripts/build-reference-data.mjs` is the only thing that should write these files. Run
`reference:check` before a release. It is deliberately **not** part of `npm run build` or
`render.yaml` — it needs network access, and a deploy must not depend on cdc.gov being up.

The check does more than diff the files: it re-derives CDC's own published P95, 120%-of-P95,
P98, P99, P99.9 and P99.99 columns from L, M, S and sigma and asserts they match. Worst
observed disagreement is 1.2e-4 percentile points across all 438 BMI rows.

**Primary snapshot.** `data-knowledge/Chart/*.xls` holds the original Excel workbooks as
downloaded from [CDC's data files page](https://www.cdc.gov/growthcharts/cdc-data-files.htm),
carrying CDC's own authorship metadata. Those are the archival record; the CSVs the script
fetches are the same data in machine-readable form.

## What these actually are

**All six tables are CDC 2000 Growth Charts (United States)**, with BMI additionally carrying
CDC's 2022 extended tail parameter.

| File | Span | Source | Measure |
| --- | --- | --- | --- |
| `weight-infant.json` | 0–36 mo | [`wtageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtageinf.csv) | weight-for-age |
| `height-infant.json` | 0–35.5 mo | [`lenageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/lenageinf.csv) | recumbent **length**-for-age |
| `weight-child.json` | 24–240 mo | [`wtage.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv) | weight-for-age |
| `height-child.json` | 24–240 mo | [`statage.csv`](https://www.cdc.gov/growthcharts/data/zscore/statage.csv) | standing **stature**-for-age |
| `bmi-child.json` | 24–240.5 mo | [`bmi-age-2022.csv`](https://www.cdc.gov/growthcharts/data/extended-bmi/bmi-age-2022.csv) | BMI-for-age, **+ `sigma`** |
| `weight-for-length.json` | 45–103.5 cm | [`wtleninf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtleninf.csv) | weight-for-length — **not yet used**, see below |

`GrowthReferenceService` switches from the infant to the child table at **24 months**
(`INFANT_CUTOVER_MONTHS`), which is also where CDC switches from length to stature.

Every one of these verifies byte-exact against its CDC source; `npm run reference:check` is
the reproducible proof, and it is what turned this file's provenance claim from an assertion
into something demonstrable. It had been wrong once before:

> An earlier version of this file described the infant tables as "WHO Child Growth
> Standards". That was wrong. The values are CDC 2000: our male birth-weight median is
> 3.530 kg where WHO's is 3.346, and the tables run to 36 months where WHO's stop at 24.
> The `wtageinf`/`lenageinf` files are CDC's own infant charts, not its WHO-based set.

## Above the 95th percentile

The plain LMS z formula has a hard ceiling wherever `L` is negative, which for BMI it is at
every age: `z` can never exceed `-1/(L·S)`. For a ten-year-old boy that is **3.0096**, so a
BMI of 35 and a BMI of 60 came out at the 99.57th and 99.83rd percentile — a quarter of a
percentile point apart, for nearly double the BMI.

CDC's December 2022 extended charts keep the same L/M/S below the 95th percentile and splice a
half-normal onto the tail above it:

```
P(bmi) = 100 × (0.95 + 0.05 × (2Φ((bmi − P95)/σ) − 1))     for bmi ≥ P95
```

`sigma` is that distribution's scale and is the only genuinely new number — the L, M and S in
the 2022 file are **bit-identical** to CDC 2000's `bmiagerev.csv`, which the build script
asserts on every run. P95 and 120%-of-P95 are derived from the LMS rather than stored, since a
second copy of a derived number is a second thing to keep in sync.

The join is continuous by construction: P95 *is* `valueAtZ(lms, 1.6448536…)`, so at exactly
that BMI both branches return 95. The slope differs either side — that kink is inherent to
splicing a modelled tail on, not a defect.

## Weight-for-length is present but unused

`weight-for-length.json` is committed and verified but nothing imports it yet. It exists to
close a real gap: `BMI_FOR_AGE_MIN_MONTHS` is 60, so a parent logging a two-year-old gets
percentiles and **no nutritional status at all**.

It is indexed on length in centimetres rather than age in months, so it needs its own lookup —
`compute(measure, sex, ageMonths, value)` does not fit it.

⚠️ **Its category cut-points are not settled and must not be guessed.** CDC's own guidance for
under-twos points at WHO, and the conventional bands differ from BMI's 5/85/95. Ship the
percentile and leave the verdict blank until a source is recorded — see
`docs/research-checklist.md` D2. A percentile with no verdict is honest; an invented verdict
is not.

## Decision: staying on CDC 2000

**2026-08-21 — the team decided to keep this US reference rather than swap to a Thai one.**
Rationale: the bone-age model (`ai-service/`, RSNA-trained) is itself calibrated against a
US/international clinical population, not a Thai one. Rather than mix a Thai growth reference
with an American-calibrated AI model, the app stays on one consistent baseline across both
features.

Worth stating plainly, since it is not symmetric: **skeletal maturation (what the bone-age
model reads) varies less by ethnicity than height/weight/BMI do** — those are far more
sensitive to genetics, nutrition and environment. So this argument is stronger for the bone-age
model than it is for the growth charts, and a Thai child's height/weight percentile against
CDC 2000 can still land noticeably off from where a Thai paediatrician would place them
(FR-10 flags anything beyond ±2 SD and tells the parent to consider seeing a doctor). Recorded
as a known trade-off, not resolved by this decision — see `research-checklist.md` D1.

**Still outstanding regardless of this decision:**

1. **TOR §2A.2 requires the reference dataset to be confirmed with the Client
   Representative.** It says the team "will have access to a standard set of pediatric
   growth reference data (e.g., WHO or national growth standards)… the specific reference
   dataset to be used shall be confirmed with the Client Representative early in the
   project." Staying on CDC 2000 is the team's call, but it is still an unconfirmed one from
   the client's side — put it to them as a decision to ratify, not reopen (`client-questions.md`
   Q1).

2. **CDC's own recommendation is WHO for 0–2 years**, CDC 2000 for 2–20. Using CDC 2000 below
   24 months departs from that. Since the decision is to stay on a US reference, the infant
   tables should be swapped for CDC's WHO-based set
   (`https://www.cdc.gov/growthcharts/who-data-files.htm`) to be internally consistent with
   CDC's own guidance.

`growth-reference.service.ts` reads whatever LMS rows these files contain; a future reference
change is a data change, not a code change. Stored `heightPercentile` / `heightSds` columns on
existing `growth_records` would need recomputing if it ever happens, since they are persisted
at write time.

## One measurement caveat

Below 24 months CDC expects **recumbent length**; at and above 24 months it expects
**standing stature**, and the two differ by roughly 0.7 cm for the same child. The app's
form asks only for "Height (cm)" with no distinction, so an infant measured standing will
read slightly short against the reference. Worth a hint on the form if under-2s are a real
target group.
