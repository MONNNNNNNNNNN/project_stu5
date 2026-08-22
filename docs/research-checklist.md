# Research checklist — evidence for every number the app shows

Raised by the client review, 2026-08-17. Internal deadline **19 Sep**, launch **2 Nov**.

This tracks the 13 points from that review. Each row says what we already have, what is
missing, and who owns closing it. Nothing gets dropped by being "obvious".

## Rules

1. **Every clinical number the app displays must cite a source** — a journal paper, a Ministry
   of Public Health / Royal College of Pediatricians of Thailand publication, or a dated,
   written decision from the Client Representative.
2. **A website is not a source** for anything shown to a parent. If the only thing we can find
   is a blog or a hospital marketing page, that becomes a client question, not a guess.
3. **Where we cannot find evidence, we say so in the app** rather than picking a plausible
   number. The app already tells parents to consider seeing a doctor — a wrong threshold sends
   the wrong families.
4. Record the date you checked a source. Guidelines change.

Status key: 🔴 not started · 🟡 in progress · 🟢 closed with citation · ⚪ blocked on client

---

## A. Puberty reference data (client points 1–4)

### A1 🟡 What age does puberty normally start, and in what range? — team decided to stay on Western cutoffs

**2026-08-21 — decision: keep the existing thresholds**, not swap to the Thai KKU figures
below. Same reasoning as `research-checklist.md` D1 (growth reference): the current cutoffs are
**Endocrine Society** figures — American — and the bone-age model is US-calibrated, so this
keeps puberty screening, growth charts, and bone age on one consistent population baseline
rather than mixing a Thai puberty reference into an otherwise American-referenced app.

**Trade-off, not a clean win — worth stating plainly:** a Khon Kaen University study of healthy
Thai girls found Thai girls' observed menarche range tops out at **14.0 y**, but the app only
flags "delayed" at **15** — a year later than the local data would flag it. Staying on the
Western threshold means a Thai girl who has not menstruated by 14.5 is not flagged, even though
Thai-specific data would call that unusual. This is an under-flagging risk (missed cases), not
an over-flagging one, and is the same shape of trade-off as the growth-reference decision.

Source, for the record — the study that was found and is no longer being pursued for adoption
([Int J Pediatr Endocrinol 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3850010/)):

| Milestone | Thai median (range) | App threshold (Endocrine Society, unchanged) |
| --- | --- | --- |
| Thelarche (breast) | 9.3 y (7.8–13.4) | early < 8, delayed > 13 |
| Pubarche (pubic hair) | 10.8 y (8.9–14.5) | early < 8 |
| Menarche | 11.6 y (10.0–14.0) | delayed > 15 |

**Still open — now a ratification, not a research task:** put this to the Client Representative
alongside the growth-reference decision — see `client-questions.md` Q3 (updated). Do **not**
chase Thai boys' data or Royal College of Pediatricians of Thailand cutoffs further; that
sourcing task is closed by this decision.

**Owner:** ___ **Due:** ___

### A2 🟡 How common is precocious puberty?

**What we have.** Central precocious puberty affects roughly **1 in 5,000–10,000** children,
female:male ≈ **10:1**
([review](https://www.sciencedirect.com/science/article/abs/pii/S2352464223002377)).

Rates are **markedly higher in Asia** and rising:

| Population | Incidence | Source |
| --- | --- | --- |
| Korea 2008–2014 | 12.28/10,000 overall — girls 26.28, boys 0.7 | [PubMed](https://pubmed.ncbi.nlm.nih.gov/30857777/) |
| Taiwan 2000–2013 | girls rose 13.56 → 110.95/10,000 | [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7559721/) |
| France 2011–2013 | girls 2.68/10,000, boys 0.24/10,000 | [PubMed](https://pubmed.ncbi.nlm.nih.gov/21714460/) |

**Missing.** A **Thailand** figure. Thai hospital case series exist
([southern Thailand 15-year](https://pubmed.ncbi.nlm.nih.gov/21714460/),
[Thai girls 5-year 2018–22](https://pubmed.ncbi.nlm.nih.gov/40049671/)) but those are referral
populations — they describe the mix of causes among children already sent to a specialist, not
how common the condition is in the general population. Do not quote a case-series percentage
as a prevalence.

**Why we need it.** The pitch and the promo video will want "X% of Thai children". If we
cannot source a Thai number, say "in Asia, rates are several times higher than in Europe" and
cite the Korean/Taiwanese data — which is defensible.

**Owner:** ___ **Due:** ___

### A3 🔴 Questions must work for a parent who is not with the child daily

Client's point: some parents work away, or the child is at boarding school / with grandparents.
Our questionnaire currently asks things a parent may simply not know.

Today's questions (`frontend/src/pages/PubertyQuestionnaire.tsx`) are the TOR Annex D items —
breast development, menstruation, testicular/genital enlargement, pubic hair, voice deepening,
growth spurt, mood/skin changes.

Several of those require close physical observation. Needed:

- an explicit **"I'm not sure"** answer, distinct from "no" — right now an unchecked box is
  treated as a confident no, which is how a delayed-onset flag gets raised wrongly
- **indirect indicators** a distant parent *can* observe: shoe/clothing size changing fast,
  height marks on a wall, body odour, acne, uniform needing replacing, appetite
- guidance on **who else can answer** — school nurse, grandparent — and whether that is
  acceptable to record

**Owner:** ___ **Due:** ___

### A4 🔴 Examples that make the signs easy to observe

Client asked for concrete examples. We currently give a clinical term and expect the parent to
know it ("thelarche", "testicular or genital enlargement").

Needed: plain-Thai description per sign, and a decision on whether to use **illustrations**
(Tanner-stage style line drawings). ⚠️ Note the TOR §3.4 constraint: *no copyrighted atlas
images may be reproduced*. Any illustration must be original or openly licensed — this is a
client question (see `client-questions.md` Q6).

**Owner:** ___ **Due:** ___

---

## B. Product design (client points 5, 8, 9, 10)

### B1 ⚪ Make Growth / Puberty / AI relate to each other

Client: *"if the height chart goes above the threshold there should be a required puberty
screening"*, and *"each menu's functions aren't related"*.

Design proposal written up in [`product-flow.md`](./product-flow.md). Needs client approval
before building.

### B2 ⚪ What does the AI actually add? — **the most important open question**

Client: *"AI เข้ามาช่วยอะไร เหมือน User ก็ต้องไปโรงพยาบาลเพื่อเอกซเรย์เหมือนเดิม"*

This is correct as stated and the app never answers it. Full argument in
[`product-flow.md`](./product-flow.md#the-ai-question); the short version is that the
bottleneck the TOR §1 describes is not *taking* the X-ray, it is finding someone qualified to
*read* it. Needs a client decision on whether that is the value proposition to build toward.

### B3 🔴 What is the usage flow?

No documented end-to-end flow exists. Draft in [`product-flow.md`](./product-flow.md), to be
checked against the deployed app.

---

## C. UI and content (client points 6, 11, 12) — **on hold**

Held at the team's instruction until research lands. Recorded so they are not lost.

| # | Item | Note |
| --- | --- | --- |
| C1 | BMI comparison chart with clear colour bands | 🟢 **unblocked and done.** Cut-points sourced to CDC (D2), and the BMI chart now draws P95 (obesity) and 120%-of-P95 (severe) in place of P97, with `nutritionalStatusKey` driving the colour |
| C2 | Articles need images | Blocked on licensing — see `client-questions.md` Q6 |
| C3 | Reduce text density, make content readable | Applies to article pages and the puberty result screen |

---

## D. Data provenance already found broken

### D1 🟡 Growth reference is CDC 2000 (US), not WHO — team decided to stay on it

The mislabel (infant tables were claimed as WHO, are actually CDC 2000) was corrected
2026-08-17.

**2026-08-21 — decision: stay on CDC 2000**, rather than swap to the Thai reference the team
had been sourcing. Rationale: the bone-age model is calibrated against a US/international
population (RSNA), and mixing that with a Thai growth reference means the two AI-adjacent
features quote two different baseline populations. One consistent reference across both beats
a per-feature match.

Flagged as a trade-off, not a clean win: skeletal maturation (bone age) is less
ethnicity-sensitive than height/weight/BMI, so the argument is stronger for the bone-age model
than it is for the growth charts. A Thai child's height/weight percentile against CDC 2000 can
still land off from where a Thai paediatrician would place them, and FR-10's ±2 SD flag inherits
that. Full reasoning in `backend/src/growth/reference-data/README.md`.

**Provenance is now proven, not asserted.** `npm run reference:check` regenerates every table
from cdc.gov and fails if the committed files disagree. All of them verify byte-exact:
weight-infant 76 rows, height-infant 74, weight-child 436, height-child 436, bmi-child 438 —
zero difference in L, M or S anywhere. The original Excel workbooks are archived in
`data-knowledge/Chart/`. This is what the rules at the top of this file ask for, applied to the
largest block of clinical numbers in the app.

**The era gap, stated plainly.** CDC 2000 is built on NHANES measurements taken between
**1963 and 1994**. The bone-age model is trained on the RSNA 2017 set — Stanford and the
University of Colorado, imaged in the 2010s. Both American, roughly forty years apart, and the
gap **cannot be closed**: CDC never reissued height or weight-for-age, and `statage-2022.csv`
and `wtage-2022.csv` both 404. CDC 2000 is still the current US standard. The one modernisation
that does exist is BMI-only and is now implemented — CDC's December 2022 extended percentiles.

**Still open — now a ratification, not an open question:** TOR §2A.2 requires the Client
Representative to confirm the reference. There is no record that happened. Bring this decision
to them as something to sign off, not reopen — see `client-questions.md` Q1 (updated). KhunLook,
the competitor the client named, uses Thailand Department of Health charts 0–19 years; worth
being ready to explain why GrowTH differs.

### D2 🟡 Clinical constants — two closed, three still uncited

| Constant | Value | Where | Status |
| --- | --- | --- | --- |
| BMI categories | <5th under, <85th healthy, <95th over, ≥95th obesity, ≥120% of P95 or BMI 35 severe | `growth.service.ts` | 🟢 **closed** — CDC, "Defining Child BMI Categories" + 2022 extended percentiles, checked 2026-08-21, cited in code |
| Precocious puberty ages | 8 girls, 9 boys | `puberty-screening.util.ts` | 🟢 **closed** — [Latronico, Brito & Carel, Lancet Diabetes Endocrinol 2016, PMID 26852255](https://pubmed.ncbi.nlm.nih.gov/26852255/), checked 2026-08-21 |
| Delayed puberty ages | 13 breast, 15 menarche, 14 testicular | `puberty-screening.util.ts` | 🔴 **no source found.** Conventional figures, but searching did not land a citation. Do not invent one |
| "notable" deviation flag | ±2 SD | `growth.service.ts` | 🔴 uncited |
| Follow-up screening interval | 4 months, 3 rounds | `puberty-screening.util.ts` | 🔴 uncited — team item |
| BMI-for-age minimum age | 5 years | `growth.service.ts` | 🔴 uncited (FR-8 states it, but FR-8's own basis is not recorded) |
| Weight-for-length categories | — | not implemented | 🔴 **needed before the table can be used** — see below |

**C1 (BMI colour bands) is unblocked.** The categories are sourced and `guidance()` now returns
a stable `nutritionalStatusKey`, so the chart can colour on a value rather than matching on
prose. The bands are already drawn: P95 and 120%-of-P95 replaced P97 on the BMI chart.

**New gap found while implementing:** `BMI_FOR_AGE_MIN_MONTHS` is 60, so a parent logging a
two-year-old gets percentiles and **no nutritional status at all**. `weight-for-length.json`
(CDC, 120 rows, 45–103.5 cm) is committed and verified but deliberately unused, because its
category cut-points are not settled — CDC's own guidance for under-twos points at WHO, and the
conventional bands differ from BMI's 5/85/95. Sourcing those cut-points is what unblocks it.

**Owner:** ___ **Due:** ___

---

### D3 🔴 No accuracy target has been set for the bone-age model

The model's measured performance is known — MAE **8.78** months, RMSE **11.66**, R² 0.9219,
**73.1%** within a year. What is *not* known is whether that is good enough, because nobody has
written down what decision the number drives.

Published comparators, for context:

| System | Error | Source |
| --- | --- | --- |
| RSNA 2017 challenge, best entry | MAD **4.27** months | [Radiology 2019](https://pubs.rsna.org/doi/abs/10.1148/radiol.2018180736) |
| RSNA 2017, top five | MAD 4.2–4.5 months | same |
| BoneXpert 3 vs manual GP | RMSE **0.68 y** boys, **0.52 y** girls | [Front Endocrinol 2023](https://www.frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2023.1130580/full) |
| BoneXpert vs mean of six raters | MAD **4.1** months | same |
| **GrowTH v1** | **MAE 8.78 / RMSE 11.66 months** | measured 2026-08-18 |

So GrowTH sits at roughly **twice** the error of the published leaders, and worse than the
commercial clinical tool.

**What we still need a citation for:** the bone-age-versus-chronological-age gap at which a
referral is actually warranted. The conventional figure used in paediatric endocrinology is
around **2 years**, but *this repo has no source for it* and the app does not currently act on
a gap threshold at all — it only displays the gap. Until that number is cited, "how accurate is
accurate enough" cannot be answered, because the tolerance is defined by the threshold.

Rough sizing, assuming errors are normally distributed (they are not exactly — RMSE/MAE is
1.33 against 1.25 for a normal, so there is a tail of larger misses): at a 2-year threshold the
current model would show a spurious ≥2-year gap in about **3–4%** of children whose true gap is
zero. Holding that under 1% needs MAE ≤ ~7.4 months; under 0.5%, ≤ ~6.8 months.

**Tasks:**
- [ ] Find and cite the clinical gap threshold — Royal College of Paediatricians of Thailand
      guidance, or a paediatric endocrinology reference. Owner: ___
- [ ] Put the target to the Client Representative: is a triage aid at MAE ~9 months acceptable,
      or must it reach published parity (~4.5) before launch? See `client-questions.md`.
- [ ] Confirm what TOR §6.3 actually requires — reporting the MAE transparently, or meeting a
      stated figure. The TOR is a scan; read §6.3 directly rather than relying on notes.

⚠️ **Before any of the above matters:** the 8.78 figure describes the *checkpoint*, measured by
the ML team with the real normalisation constants. The deployed service uses **inferred**
`AGE_MEAN`/`AGE_STD`, so the accuracy of what is actually in production is unmeasured. Getting
those constants confirmed outranks every row above. See `model-updates.md`.

**Owner:** ___ **Due:** ___

---

## E. New scope (client points 7, 13)

### E1 ⚪ Google OAuth login

Not in the TOR's FR list (FR-1 to FR-24 specify email + password only). Adding it is scope
change — needs client agreement, and TOR §13 flags scope creep as a named project risk.
See `client-questions.md` Q5.

### E2 🟢 Competitor analysis

Done — [`competitor-analysis.md`](./competitor-analysis.md). KhunLook is a Mahidol-affiliated,
peer-reviewed, RCT-validated app. Read it before the client meeting.

---

## Summary for the client meeting

| Blocking | Item | Who decides |
| --- | --- | --- |
| FR-12/13 correctness | Puberty age thresholds — team decided Western, needs ratification | Client |
| FR-7/8/9 correctness, TOR §2A.2 | Growth reference — team decided CDC 2000, needs ratification | Client |
| Whether bone age is worth further investment | The AI value question | Client |
| Feature integration | Growth → Puberty → Bone Age triggers | Client |
| ~~C1 BMI chart~~ | ~~BMI category source~~ | 🟢 closed — CDC, cited in code 2026-08-21 |
| Scope | Google OAuth | Client |
