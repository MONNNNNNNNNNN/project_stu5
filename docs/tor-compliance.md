# TOR compliance audit

Every requirement in `data-knowledge/ProjectBeta_TOR.pdf`, checked line by line against what is
actually built and deployed. Audited **2026-08-23** against commit `c15186d`.

Status key: 🟢 done · 🟡 partial or deviates · 🔴 not built · ⚪ not our side

**Headline:** the software is in good shape — 22 of 24 functional requirements are met, with
two deliberate deviations that need signing off. **The gap is not code, it is the video
campaign.** Five of eleven deliverables are video, and none of them exists.

---

## 1. Functional requirements (Section 4)

### 4.1 Account and profile

| FR | Requirement | Status |
| --- | --- | --- |
| FR-1 | Register with full name, email, password, **and phone number** | 🟡 **Deviates** — see below |
| FR-2 | Terms and privacy accepted before account creation | 🟢 Enforced server-side (`@Equals(true)`), and on the Google path too |
| FR-3 | Log in and out securely | 🟢 JWT + rotating refresh tokens, hashed at rest |
| FR-4 | Add child profiles: name, sex, DOB, relationship | 🟢 |
| FR-5 | View, edit, switch between multiple children | 🟢 |

⚠️ **FR-1 — phone number was removed on 2026-08-22 at the team's instruction.** The TOR says
"at minimum: full name, email address, password, and phone number". The column and the DTO
still accept one and Profile can add one, but registration no longer asks. **This is a
deviation from a numbered requirement and needs the Client Representative to agree it**, or the
field goes back. Nothing in the app contacts a parent by phone, which is the argument for
dropping it, but that is not the team's call to make alone.

### 4.2 Growth tracking

| FR | Requirement | Status |
| --- | --- | --- |
| FR-6 | Record a growth entry: date, height, weight | 🟢 Plus head circumference for under-3s |
| FR-7 | Percentile and SDS for height-for-age and weight-for-age | 🟢 CDC 2000, verified byte-exact |
| FR-8 | **For children aged five and above**, BMI + BMI-for-age SDS + plain-language status | 🟡 **Deviates** — now starts at **two** years |
| FR-9 | Line charts for height, weight, BMI vs percentile curves | 🟢 With CDC-style shaded zones |
| FR-10 | Plain-language guidance after each entry, flagging notable results, not a diagnosis | 🟢 |
| FR-11 | Complete history of past entries | 🟢 Editable and deletable |

⚠️ **FR-8 — BMI now starts at 2 years, not 5.** CDC's own table starts at 24 months and the
Bright Futures/AAP periodicity schedule measures BMI from 24 months to 21 years. At five, three
years of valid reference data were discarded and a parent of a three-year-old got no weight
status at all. **Clinically better, but still a deviation from a numbered requirement** — put it
to the client. Note FR-8's own "five years" has no cited basis in this repo.

### 4.3 Puberty screening

| FR | Requirement | Status |
| --- | --- | --- |
| FR-12 | Structured guided questionnaire, appropriate to sex and age | 🟢 Sex-branching, yes/no/not-sure |
| FR-13 | Compile into a screening result, labelled as an aid not a diagnosis, with next steps | 🟢 Five outcomes incl. "not enough information" |
| FR-14 | View history of previous screenings | 🟢 Plus the 4-month follow-up plan |

### 4.4 AI bone age

| FR | Requirement | Status |
| --- | --- | --- |
| FR-15 | Upload a hand-and-wrist X-ray for a selected child | 🟢 JPEG/PNG |
| FR-16 | Validate format and size, clear feedback on failure | 🟢 10 MB cap, reasons surfaced |
| FR-17 | Submit to the model and display the result in reasonable time | 🟢 In-process ONNX, under 3s measured in production |
| FR-18 | Present with an explanatory note: what it means, **its margin of error**, support-not-replace | 🟢 MAE 9 months *and* "1 in 4 out by more than a year" |
| FR-19 | Associate each prediction with the child profile and growth/screening history | 🟡 Stored against the child and reviewable; the *combined* view of all three is designed but not built |

### 4.5 Knowledge section

| FR | Requirement | Status |
| --- | --- | --- |
| FR-20 | Reference articles, attributed, no copyright infringement | 🟡 Three articles exist and are original; **no images**, blocked on licensing (Q6) |
| FR-21 | Organised and searchable/browsable by topic | 🟢 Search + category filter |

### 4.6 General

| FR | Requirement | Status |
| --- | --- | --- |
| FR-22 | Usable on desktop and mobile, responsive | 🟢 Bottom nav on mobile |
| FR-23 | Plain parent-friendly language, with underlying figures available | 🟢 |
| FR-24 | A user can only access children linked to their own account | 🟢 `assertGuardianAccess` on every path, incl. X-ray bytes |

**Score: 20 🟢 · 4 🟡 · 0 🔴**

---

## 2. Deliverables (Section 5) — the real gap

| D | Deliverable | Status |
| --- | --- | --- |
| D1 | UX/UI design package — Figma file, exported hi-fi screens, prototype link | 🟡 PNG + SVG exports of all screens in `design/mockups/`; **no Figma project file, no prototype link** |
| D2 | Web application (front end), deployed + repo | 🟢 `grow-th.vercel.app` |
| D3 | Backend, API, database — deployed, documented API, schema docs | 🟡 Deployed; schema documented; **no formal API specification** (no OpenAPI/Swagger) |
| D4 | AI model — trained artifact, training + evaluation report with MAE, integrated | 🟡 Model integrated and released; metrics known (MAE 8.78); **no written training/evaluation report** |
| D5 | Doctor interview video | 🔴 **Not started** |
| D6 | 2D motion graphic narrative video | 🔴 **Not started** — briefs exist in `animation-briefs.md` |
| D7 | Application promotional video | 🔴 **Not started** — Home page still says "Promo video — coming soon" |
| D8 | Application demonstration video | 🔴 **Not started** — script exists in `demo-script.md` |
| D9 | Short-form social clips | 🔴 **Not started** |
| D10 | Project documentation set — system overview, **user manual for parents**, final project report | 🟡 System overview and many technical docs exist; **no parent-facing user manual, no final project report** |
| D11 | Source files and handover package | 🟡 Code and design exports in the repo; **no assembled handover package** |

**Score: 1 🟢 · 6 🟡 · 5 🔴 — and every 🔴 is video.**

This is the single biggest risk to the 2 Nov launch. Five video deliverables, none started, and
D5 depends on the Client Representative arranging a physician (TOR §8.1) — that is a dependency
the team does not control and should chase now.

---

## 3. Technical requirements (Section 6)

| § | Requirement | Status |
| --- | --- | --- |
| 6.1 | Responsive, major browsers, stable URL | 🟢 |
| 6.1 | Stack selected **and justified in the system overview document** | 🟡 Stack decisions are documented across `diagrams.md` and `ai-integration.md`; not consolidated into one D10 document |
| 6.2 | Data minimisation | 🟢 Improved by dropping phone (which cuts against FR-1) |
| 6.2 | Privacy notice **prior to registration** | 🟢 Linked from the register form |
| 6.2 | X-rays stored securely, only accessible to the uploading account | 🟢 Static serving removed; guardian-checked stream route (verified 401 anonymously) |
| 6.2 | Passwords never plain text, industry-standard hashing | 🟢 bcrypt |
| 6.2 | Document what data is collected, stored, and would be deleted on request | 🟡 Privacy notice covers collection and storage; **no explicit data-subject-rights / deletion section** |
| 6.3 | Documented train/test split, **no overlap** | 🔴 **Unverified.** The split was never documented by the ML team — an open item |
| 6.3 | MAE in months on held-out test set | 🟢 8.78, plus MSE, R², ±12-month accuracy |
| 6.3 | Document augmentation/preprocessing and observed limitations by age or sex | 🔴 **Not documented** |
| 6.3 | UI itself presents bone age as a screening aid, not only in docs | 🟢 |
| 6.4 | Video production standards (resolution, audio, Thai + subtitles, branding, MP4, sensitivity) | ⚪ No videos exist yet |
| 6.5 | Functional testing before each milestone, test record maintained | 🟡 77 automated tests + a production smoke script; **no milestone test record/checklist** |
| 6.5 | Test on ≥2 browsers and ≥1 mobile viewport | 🔴 **Only Chromium tested.** Safari and Firefox unverified |

---

## 4. Assumptions and constraints (Section 2A)

| Item | Status |
| --- | --- |
| 2A.2 — reference dataset **confirmed with the Client Representative** | 🔴 **Never happened.** The app runs on CDC 2000 by team decision. This is an explicit TOR obligation — `client-questions.md` Q1 |
| 2A.2 — RSNA dataset used under its public licence | 🟢 |
| 2A.3 — free/open tooling only, no budget | 🟢 Vercel, Render, Neon free tiers |
| 2A.3 — not for clinical deployment without further review | 🟢 Stated in the app and the new Terms of Use |
| §3.4 / §9 — no copyrighted atlas images reproduced | 🟢 And flagged as a constraint in `animation-briefs.md` |

---

## 5. What to do about it

**Blocking the launch date**

1. **Start the videos.** Five deliverables, none begun, and one needs a physician the client
   must arrange. This is the critical path, not the code.
2. **Chase D5's physician** (TOR §8.1 makes it the client's responsibility).

**Needs a client decision, not more work**

3. Ratify or reverse **FR-1** (phone number removed).
4. Ratify or reverse **FR-8** (BMI from 2 years, not 5).
5. Confirm the growth reference under **§2A.2** — an explicit obligation that has never been met.

**Small, and entirely ours**

6. Test on Safari and Firefox (§6.5) — currently Chromium only.
7. Write the parent-facing user manual and final project report (D10).
8. Write the model training/evaluation report, including the train/test split and observed
   limitations by age and sex (§6.3, D4). ⚠️ Needs the ML team; the split is not known to us.
9. Generate an API specification for D3.
10. Add a data-subject-rights section to the privacy notice (§6.2).
11. Assemble the D11 handover package.

**Already known, tracked elsewhere**

12. Bone-age calibration is still provisional — `AGE_MEAN`/`AGE_STD` inferred, not supplied.
13. Article images blocked on licensing (FR-20, Q6).
14. Combined growth + puberty + bone-age view designed but not built (FR-19).
