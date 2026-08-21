# Questions for the Client Representative

Prepared 2026-08-18, from the client review. Ordered by how much work each unblocks.

Each question states **why we are asking** and **what we do with each answer**, so the meeting
produces decisions instead of discussion. Ten questions — should fit one session.

Bring [`research-checklist.md`](./research-checklist.md) and
[`competitor-analysis.md`](./competitor-analysis.md) as backup.

---

## Q1 — Confirm: growth reference stays CDC 2000 (US) ⚠️ TOR obligation

**Why.** TOR §2A.2 says the reference dataset *"shall be confirmed with the Client
Representative early in the project"*. That confirmation has never happened. The app has been
running on **CDC 2000 (United States)** tables — a US reference applied to Thai children —
this whole time, and every percentile, SDS, and "consider seeing a doctor" prompt under FR-10
comes from these numbers.

**Team decision (2026-08-21):** stay on CDC 2000 rather than swap to a Thai reference, so that
the growth charts and the bone-age model — which is itself calibrated against a
US/international population — quote one consistent baseline instead of two. This is not being
raised as an open choice; it is a decision the team needs you to **ratify**, per §2A.2.

Trade-off worth knowing before you sign off: a Thai child's height/weight percentile against
CDC 2000 can land off from where a Thai paediatrician would place them, more so than for bone
age — skeletal maturation is less ethnicity-sensitive than height/weight/BMI. KhunLook, for
comparison, uses Thailand Department of Health charts, 0–19 years.

**Options.**

| Answer | What we do |
| --- | --- |
| Confirm CDC 2000 | We record the date and this rationale as the §2A.2 confirmation, and close this permanently |
| No — use Thai MOPH / TSPE charts instead | We need the LMS parameter tables, not printed charts — see Q2. Also means bone age and growth charts run on different baseline populations, which we'd document as accepted |
| No — use WHO instead | We can implement immediately; WHO publishes LMS openly. Thailand already uses WHO for under-5s |

**Cost of a later change.** Data-only, no code rewrite — *except* that stored percentile/SDS
columns on existing records must be recomputed, or old and new records will quote different
populations on the same chart.

---

## Q2 — If you choose Thai instead: can you get us the reference as **parameters**, not charts?

**Why.** Our engine needs LMS values (L, M, S per age per sex). Thai growth charts are usually
published as printable percentile charts. Those are not directly usable.

**Options.**

| Answer | What we do |
| --- | --- |
| LMS tables available (CSV/Excel) | Straight swap. Best case |
| Only percentile tables (P3/P50/P97…) | We can *fit* LMS to them — but this changes the numbers slightly and needs your written sign-off, because it is a clinical judgement |
| Only printed charts | **We cannot use them.** Digitising a curve by eye is not acceptable provenance for something that tells a parent to see a doctor. We would fall back to WHO |

---

## Q3 — Should the puberty age thresholds follow Thai data?

**Why.** The app currently flags "early" below 8 and "delayed" above 13 (breast) / 15
(menarche). These are Western cutoffs with no citation. A Khon Kaen University study of healthy
Thai girls found:

- thelarche median **9.3 y** (range 7.8–13.4)
- menarche median **11.6 y** (range **10.0–14.0**)

Thai girls' observed menarche range ends at 14.0, so our "delayed" flag at 15 fires later than
local data supports — we would be reassuring families we should be flagging.

**Options.**

| Answer | What we do |
| --- | --- |
| Adopt Thai study figures | Update the constants, cite the paper in the code and the UI |
| Use Royal College of Pediatricians of Thailand guidance | Please point us to it — we could not find published cutoffs |
| Keep international cutoffs | We document why, and cite the guideline followed |

**Also needed:** we found no equivalent Thai dataset for **boys**. Do you know of one?

---

## Q4 — What is the AI bone age actually for? 🔴 Most important

**Why.** Your review said: *"AI เข้ามาช่วยอะไร เหมือน User ก็ต้องไปโรงพยาบาลเพื่อเอกซเรย์เหมือนเดิม"*.
That is correct, and the app never answers it. We should not keep investing in this feature
without a clear answer.

The TOR's own background (§1) suggests one: the bottleneck is not *taking* the X-ray, it is
that *"many healthcare facilities in Thailand do not have ready access to a pediatric
endocrinologist or a radiologist experienced in bone age reading, which can delay diagnosis and
referral."*

So the defensible framing is: **the app does not save the hospital visit — it shortens the wait
between having the film and knowing whether it matters.** The realistic user already has an
X-ray taken at a district hospital that cannot interpret it.

**Options.**

| Answer | What we do |
| --- | --- |
| Yes, that framing is right | We state it plainly in the UI and the promo video, and target the "already has a film" user |
| No — parents should be able to start from the app | Then the feature needs rethinking. Neither we nor an app can order an X-ray |
| It is primarily an academic ML exercise | Fine, but then say so in the UI and lower its prominence in the product |

---

## Q5 — Is Google OAuth in scope?

**Why.** You asked for it, but the TOR's functional requirements (FR-1 to FR-24) specify email
and password only. TOR §13 lists scope creep as a named project risk, and says changes should
be raised with you explicitly rather than implemented ad hoc.

With a fixed 2 Nov launch and the AI integration still unbuilt, we would rather you decide
where this sits.

**Options.** In scope (we log it as an agreed change and schedule it) · nice-to-have if time
allows · out of scope.

---

## Q6 — Article images: who supplies them, under what licence?

**Why.** You asked for illustrated articles. We have no image budget (TOR §2A.3 — free/open
tools only) and TOR §3.4 forbids reproducing copyrighted atlas images.

This also affects the puberty questionnaire: parents would find **Tanner-stage line drawings**
far easier than clinical wording — but those must be original or openly licensed.

**Options.** You supply approved images · we source Creative Commons and you approve each ·
we commission original illustration from the team's design members · text only.

---

## Q7 — How should we handle parents who are not with the child daily?

**Why.** Your review raised this and it is a real gap. Our questionnaire assumes close physical
observation ("has breast development been observed?"). A parent working away, or a child living
with grandparents, cannot answer honestly — and an unchecked box is currently read as a
confident "no", which can raise a false "delayed development" flag.

**What we propose** (needs your agreement):

- add an explicit **"not sure"** answer, kept distinct from "no"
- add indirect signs a distant parent *can* observe — clothing/shoe size changing quickly,
  height marks, body odour, acne
- allow the result to say *"not enough information"* instead of forcing an outcome

**Question for you:** is it acceptable for a **school nurse or grandparent** to answer, and
should the app record who did?

---

## Q7a — At what age should puberty screening first be offered?

**Why.** You told us to only ask the puberty questions once the child's age reaches a certain
point — the team's notes did not capture the specific age you gave, and we would rather
re-ask than guess at something this clinical. We do not want to invent a number and have it
turn out wrong in either direction: gate it too late and a child with a genuine early sign at,
say, age 6 never gets flagged before the threshold; gate it too early and parents of very young
children get asked clinically-loaded questions with no relevance yet.

**Options.**

| Answer | What we do |
| --- | --- |
| Gate at the precocious-puberty threshold age (8 for girls, 9 for boys) | Matches the age the app already uses to flag "early" — but by definition delays the prompt past the age where catching an early case matters most |
| A younger age you specify | We use it directly |
| No gate — offer it any time BMI flags | Simplest to build, but risks the "why is my toddler being asked about menstruation" reaction you may have been trying to avoid |

---

## Q8 — Should the features trigger each other?

**Why.** You said the menus are not related. We agree — Growth, Puberty and Bone Age are three
parallel screens that never reference each other, and a bone age only means something next to a
growth chart and a puberty stage.

**What we propose**, matching the flow you described (detail in
[`product-flow.md`](./product-flow.md)):

| Trigger | Action |
| --- | --- |
| BMI outside the healthy range (Underweight / Overweight / Obesity) | prompt a puberty screening — once the age gate in Q7a is settled |
| screening returns "early signs" | prompt a bone-age upload, and a "see a doctor" notification with a recurring follow-up |
| bone age well ahead of chronological age | show on the growth chart, prompt referral |

We changed this from an earlier draft that used height/weight SDS as the growth trigger — that
was our own guess before we confirmed BMI was what you meant. Please correct us if BMI is not
right either.

**Question for you:** should these be **required** (blocking) or **suggested** (dismissible)?
We lean strongly to suggested — a required medical questionnaire a parent cannot skip will make
them abandon the app, and we cannot compel anyone.

---

## Q9 — Is there a Thai prevalence figure for precocious puberty?

**Why.** The promo video and pitch will want "X% of Thai children". We found Asian regional
figures (Korea 26.28/10,000 girls; Taiwan rising sharply) and the general 1-in-5,000-to-10,000
estimate, but **no Thailand population figure**. Thai hospital case series exist, but those
describe children already referred to a specialist — quoting them as prevalence would be wrong.

**Options.** You have a source · use regional Asian data with clear attribution · avoid a
specific number in the campaign.

---

## After the meeting

Record every answer **in writing with the date**, and add it to
[`research-checklist.md`](./research-checklist.md). TOR §12.1 makes the data-privacy and
reference decisions part of final acceptance, so "we discussed it verbally" will not hold up at
the M7 review.
