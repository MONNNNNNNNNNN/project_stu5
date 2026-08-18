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

### A1 🟡 What age does puberty normally start, and in what range?

**What we have.** Verified — and it does not match what the app currently does.

A Khon Kaen University study of healthy Thai girls
([Int J Pediatr Endocrinol 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3850010/)):

| Milestone | Thai median (range) | Thai mean | App threshold today |
| --- | --- | --- | --- |
| Thelarche (breast) | **9.3 y** (7.8–13.4) | 10.1 ± 1.2 | early < 8, delayed > 13 |
| Pubarche (pubic hair) | **10.8 y** (8.9–14.5) | 11.6 ± 1.2 | early < 8 |
| Menarche | **11.6 y** (10.0–14.0) | 11.6 ± 0.8 | delayed > 15 |

The app's numbers live in `backend/src/puberty/puberty-screening.util.ts:8-12` and are Western
cutoffs with **no citation in the repo**.

Two concrete mismatches to put to the client:

- Thai girls' observed menarche range tops out at **14.0**, but the app only flags "delayed" at
  **15** — later than the local data supports.
- Median thelarche at **9.3** means a large, healthy fraction of Thai girls start before 10.
  Our "early" flag at 8 is probably still right, but it should be a decision, not an inheritance.

**Missing.** Thai **boys** — no equivalent Thai dataset found yet. Also whether the Royal
College of Pediatricians of Thailand publishes its own recommended cutoffs, which would
outrank a single study.

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
| C1 | BMI comparison chart with clear colour bands | Needs the BMI cut-points sourced first (see D2) — colour bands encode clinical categories, so the categories must be right before they are coloured |
| C2 | Articles need images | Blocked on licensing — see `client-questions.md` Q6 |
| C3 | Reduce text density, make content readable | Applies to article pages and the puberty result screen |

---

## D. Data provenance already found broken

### D1 🟢 Growth reference is CDC 2000 (US), not WHO

Closed and corrected 2026-08-17. `backend/src/growth/reference-data/README.md` claimed the
infant tables were WHO Child Growth Standards. They are CDC 2000: our male birth-weight median
is 3.530 kg where WHO's is 3.346, and the tables run to 36 months where WHO's stop at 24.

**Still open:** which reference we *should* use. TOR §2A.2 requires the Client Representative to
confirm this and there is no record that it happened. KhunLook — the competitor the client
named — uses **Thailand Department of Health charts 0–19 years**. Thai files are being sourced
by the team; the sandbox is blocked from `thaipedendo.org`.

### D2 🔴 Every other clinical constant in the app is uncited

Each of these currently has no source recorded:

| Constant | Value | Where |
| --- | --- | --- |
| "notable" deviation flag | ±2 SD | `growth.service.ts:9` |
| BMI categories | <5th underweight, <85th healthy, <95th overweight, else obesity | `growth.service.ts:17-22` |
| Follow-up screening interval | 4 months, 3 rounds | `puberty-screening.util.ts:20-23` |
| BMI-for-age minimum age | 5 years | `growth.service.ts:8` |

The BMI cut-points look like the CDC/US convention. If we move to a Thai growth reference,
**the categories may move with it** — Thai MOPH uses its own nutritional-status bands. Do not
colour the BMI chart (C1) until this is settled.

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
| FR-12/13 correctness | Puberty age thresholds — Thai or Western | Client |
| FR-7/8/9 correctness, TOR §2A.2 | Growth reference | Client |
| Whether bone age is worth further investment | The AI value question | Client |
| Feature integration | Growth → Puberty → Bone Age triggers | Client |
| C1 BMI chart | BMI category source | Team research, then client confirms |
| Scope | Google OAuth | Client |
