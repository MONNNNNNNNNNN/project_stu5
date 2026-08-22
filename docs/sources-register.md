# Sources register

Every number, threshold and dataset the app uses on a real child — where it came from, or that
it has no source yet. Compiled **2026-08-23**.

**To open this as a Google Doc:** download the file and use *Google Docs → File → Open →
Upload*, or `File → Import` from an existing doc. Markdown tables convert cleanly. I cannot
create a Doc directly — that needs a Google account this environment is not signed in to.

Status: 🟢 cited and dated · 🟡 partly sourced or ambiguous · 🔴 no source

---

## Part 1 — Sourced and in use

### Growth reference data

| What | Source | Checked |
| --- | --- | --- |
| Weight-for-age, infants | CDC 2000, [`wtageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtageinf.csv) | 2026-08-22 |
| Length-for-age, infants | CDC 2000, [`lenageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/lenageinf.csv) | 2026-08-22 |
| Weight-for-age, children | CDC 2000, [`wtage.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv) | 2026-08-22 |
| Stature-for-age, children | CDC 2000, [`statage.csv`](https://www.cdc.gov/growthcharts/data/zscore/statage.csv) | 2026-08-22 |
| BMI-for-age + extended tail | CDC 2022, [`bmi-age-2022.csv`](https://www.cdc.gov/growthcharts/data/extended-bmi/bmi-age-2022.csv) | 2026-08-22 |
| Head circumference, infants | CDC 2000, [`hcageinf.csv`](https://www.cdc.gov/growthcharts/data/zscore/hcageinf.csv) | 2026-08-23 |
| Weight-for-length *(not in use)* | CDC 2000, [`wtleninf.csv`](https://www.cdc.gov/growthcharts/data/zscore/wtleninf.csv) | 2026-08-22 |

🟢 All verified **byte-exact** against source — `cd backend && npm run reference:check`.
Archival copies of the original Excel workbooks: `data-knowledge/Chart/*.xls`.

### Clinical thresholds

| What | Value | Source |
| --- | --- | --- |
| BMI weight-status categories | <5th under, <85th healthy, <95th over, ≥95th obesity | 🟢 CDC, "Defining Child BMI Categories" (2026-08-21) |
| Severe obesity | ≥120% of P95, or BMI ≥35 | 🟢 CDC 2022 extended percentiles |
| Precocious puberty | before 8 (girls), 9 (boys) | 🟢 [Latronico, Brito & Carel, *Lancet Diabetes Endocrinol* 2016, PMID 26852255](https://pubmed.ncbi.nlm.nih.gov/26852255/) |
| BMI-for-age starts at | 24 months | 🟢 Bright Futures/AAP periodicity schedule, 4th ed. (2026-08-23) |
| Head circumference measured | birth → 24 months | 🟢 same |
| Weight-for-length measured | birth → 18 months | 🟢 same |
| Well-child visit schedule | 3–5 d, 1, 2, 4, 6, 9, 12, 15, 18, 24, 30 mo, then yearly to 21 y | 🟢 same, cross-checked against [HealthyChildren.org](https://www.healthychildren.org/English/family-life/health-management/Pages/Well-Child-Care-A-Check-Up-for-Success.aspx) |

### AI model

| What | Value | Source |
| --- | --- | --- |
| Training dataset | RSNA Pediatric Bone Age, ~12,611 train / 1,425 val | 🟢 TOR §3.4; Stanford + Univ. of Colorado |
| Architecture | EfficientNet-B0 + sex input, 1281→128→1 | 🟢 Recovered from the checkpoint, `strict=True` load, 0 missing keys |
| MAE / MSE / R² / ±12 mo | 8.78 mo / 135.91 / 0.9219 / 73.1% | 🟢 Supplied by the ML team, 2026-08-18 |
| Benchmark: RSNA challenge best | MAD 4.27 mo (top five 4.2–4.5) | 🟢 [Radiology 2018](https://pubs.rsna.org/doi/abs/10.1148/radiol.2018180736) |
| Benchmark: BoneXpert vs manual GP | RMSE 0.52–0.68 y | 🟢 [Front Endocrinol 2023](https://www.frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2023.1130580/full) |

### Background / competitive

| What | Source |
| --- | --- |
| Precocious puberty incidence, Korea | 🟢 [PubMed 30857777](https://pubmed.ncbi.nlm.nih.gov/30857777/) |
| Precocious puberty incidence, Taiwan | 🟢 [PMC7559721](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7559721/) |
| Precocious puberty incidence, France | 🟢 [PubMed 21714460](https://pubmed.ncbi.nlm.nih.gov/21714460/) |
| Thai girls' puberty milestones (**found, not adopted**) | 🟢 [Int J Pediatr Endocrinol 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3850010/) |
| KhunLook competitor | 🟢 Mahidol-affiliated, JMIR-published RCT |

---

## Part 2 — 🔴 No source. In the app, shown to parents.

**These are the ones that matter.** Each is a number a parent sees, or that decides what they
are told, with nothing behind it.

| # | What | Value | Where | Notes |
| --- | --- | --- | --- | --- |
| 1 | Delayed puberty — no breast development | by age 13 | `puberty-screening.util.ts` | Conventional, but searching found no citable guideline |
| 2 | Delayed puberty — no menarche | by age 15 | same | Thai data suggests 14 would be more appropriate locally; we stayed Western by decision |
| 3 | Delayed puberty — no testicular enlargement | by age 14 | same | |
| 4 | "Notable deviation" growth flag | ±2 SD | `growth.service.ts` | Drives the "see a paediatrician" message under FR-10 |
| 5 | Follow-up screening interval | 4 months × 3 rounds | `puberty-screening.util.ts` | |
| 6 | BMI-for-age minimum age (FR-8) | was 5 y | TOR | FR-8's own basis is unrecorded; we moved to 2 y on AAP/CDC grounds |
| 7 | Bone-age gap treated as notable | 2 years | `suggestions.service.ts` | Only ~2× the model's own mean error |
| 8 | BMI ↔ puberty-onset link | — | `suggestions.service.ts` | **The entire clinical basis for the growth→puberty trigger** |
| 9 | Puberty screening age gate | 6 years | `suggestions.service.ts` | Client asked for a gate; the age was never captured |
| 10 | Weight-for-length categories | — | not implemented | Why that table is committed but unused |
| 11 | Measurement frequency in `measurement-schedule.md` | — | doc only | Now partly closed by the AAP schedule above |

---

## Part 3 — 🟡 Ambiguous or unverified

| # | Item | The ambiguity |
| --- | --- | --- |
| 1 | **Bone-age calibration** | `AGE_MEAN` 127.3 / `AGE_STD` 41.7 were **derived by us** from the reported MSE and R², not supplied. Every result is flagged provisional. **The deployed model's real accuracy is therefore unmeasured** — 8.78 describes the checkpoint, not production |
| 2 | **Sex encoding** | Assumed male = 1. A flip degrades one sex silently, with no error |
| 3 | **Input resolution** | Assumed 224×224 |
| 4 | **Normalisation** | Assumed ImageNet mean/std |
| 5 | **Train/test split** | TOR §6.3 requires it documented with no overlap. Never supplied |
| 6 | **Growth reference choice** | TOR §2A.2 requires client confirmation. Never happened |
| 7 | **CDC 2000 era** | Built on NHANES measurements from **1963–1994**, applied to Thai children in 2026. Unclosable — CDC never reissued height/weight |
| 8 | **Length vs stature** | CDC expects recumbent length <24 mo and standing stature ≥24 mo; they differ ~0.7 cm. The form asks only "Height (cm)" |
| 9 | **Terms of Use** | Team-drafted, not lawyer-reviewed, taking PDPA guardian consent |
| 10 | **Article content** | Original, but the clinical claims inside are not individually cited |

⚠️ Items 1–4 all collapse with **one labelled sample X-ray** from the ML team. That single
artefact is worth more than any other outstanding request.

---

## Part 4 — What to ask for

**From the ML team**
1. One labelled sample X-ray with its true bone age → settles ambiguities 1–4.
2. `AGE_MEAN` / `AGE_STD` as actually used in training.
3. The train/test split description (TOR §6.3).
4. Preprocessing and augmentation actually applied, and any performance variation by age or sex.

**From the Client Representative**
5. Confirm the growth reference (§2A.2 — outstanding obligation).
6. Ratify FR-1 (phone removed) and FR-8 (BMI from 2 y).
7. The puberty screening age gate (#9 above).
8. Article image licensing.
9. Review the Terms of Use.

**Team research** — items 1–5, 7, 8, 10 in Part 2. Rule from the checklist still stands: *a
website is not a source for anything shown to a parent, and where no evidence exists we say so
rather than pick a plausible number.*
