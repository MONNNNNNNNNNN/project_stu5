# Growth reference data

LMS (Box-Cox power / median / coefficient-of-variation) parameter tables used to compute
height/weight/BMI-for-age percentiles and SDS (z-scores), per TOR FR-7/FR-8.

Each row: `{ sex: 1 (male) | 2 (female), ageMonths, L, M, S }`. Retrieved 2026-07-21.

```
Z = ((x/M)^L − 1) / (L·S)   when L ≠ 0
Z = ln(x/M) / S             when L = 0
percentile = Φ(Z) × 100
```

## What these actually are

**All five tables are CDC 2000 Growth Charts (United States).**

| File | Age span | Source | Measure |
| --- | --- | --- | --- |
| `weight-infant.json` | 0–36 mo | [`wtageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtageinf.csv) | weight-for-age |
| `height-infant.json` | 0–35.5 mo | [`lenageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/lenageinf.csv) | recumbent **length**-for-age |
| `weight-child.json` | 24–240 mo | [`wtage.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv) | weight-for-age |
| `height-child.json` | 24–240 mo | [`statage.csv`](https://www.cdc.gov/growthcharts/data/zscore/statage.csv) | standing **stature**-for-age |
| `bmi-child.json` | 24–240.5 mo | [`bmiagerev.csv`](https://www.cdc.gov/growthcharts/data/zscore/bmiagerev.csv) | BMI-for-age |

`GrowthReferenceService` switches from the infant to the child table at **24 months**
(`INFANT_CUTOVER_MONTHS`), which is also where CDC switches from length to stature.

> An earlier version of this file described the infant tables as "WHO Child Growth
> Standards". That was wrong. The values are CDC 2000: our male birth-weight median is
> 3.530 kg where WHO's is 3.346, and the tables run to 36 months where WHO's stop at 24.
> The `wtageinf`/`lenageinf` files are CDC's own infant charts, not its WHO-based set.

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
