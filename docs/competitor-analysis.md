# Competitor analysis

Prepared 2026-08-18. The client named **KhunLook** specifically, so it goes first.

---

## KhunLook (คุณลูก)

[App Store](https://apps.apple.com/th/app/khunlook-%E0%B8%84-%E0%B8%93%E0%B8%A5-%E0%B8%81/id961051837) ·
[Google Play](https://play.google.com/store/apps/details?id=hda.app.khunlook)

**This is a serious competitor, not a student project.** Mahidol-affiliated, published in JMIR
mHealth and uHealth with both a
[development and validation study (2020)](https://mhealth.jmir.org/2020/10/e15116/) and a
[randomised controlled trial (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10206628/)
against the paper Maternal and Child Health Handbook.

### What it does

Seven features: growth and nutrition, development, immunisations, oral health, appointment
reminders, memories, health advice.

Its clinical grounding is the thing to note:

- growth plotted against **Thailand Department of Health growth charts, ages 0–19**
- development milestones from the **Ministry of Public Health and the Royal College of
  Pediatricians of Thailand**, ages 0–6
- immunisation schedule from the **Royal College of Pediatricians of Thailand**, ages 0–12

### Evidence behind it

- Parent-vs-physician growth assessments showed **no significant difference**, with higher
  agreement in the app group than the paper handbook for weight and head circumference
- Parents rated it easier to use than the paper handbook across every health domain

### What this means for us

**Three things we should take seriously:**

1. **It already solves growth tracking, and does it with the correct Thai reference.** We stay
   on CDC 2000 (US), deliberately, to keep one baseline population across growth tracking and
   the bone-age model. On our single strongest overlapping feature, the incumbent is more
   locally correct than we are — worth being upfront about at the client meeting rather than
   letting them find it. See
   [Q1](./client-questions.md#q1--confirm-growth-reference-stays-cdc-2000-us--tor-obligation).
2. **It independently confirms a Thai reference is real and usable in production**, which is
   the road not taken here — the trade-off is recorded in `research-checklist.md` D1.
3. **Breadth is not where we win.** Seven features, years of iteration, institutional backing,
   a budget. We have 11 people, zero budget, and a fixed 2 Nov date.

**Where GrowTH is genuinely different — and it is a narrow but real gap:**

| | KhunLook | GrowTH |
| --- | --- | --- |
| Growth tracking vs Thai charts | ✅ | ⚠️ currently CDC 2000 |
| Development milestones, immunisations, oral health | ✅ | ❌ not in scope |
| **Structured puberty screening** | ❌ | ✅ |
| **AI bone age from an X-ray** | ❌ | ✅ (not yet wired) |
| Platform | native iOS/Android | responsive web |

**Honest read:** KhunLook is a child *health record*. GrowTH is, or should be, a *puberty and
growth-concern screening tool*. Those are different jobs. Trying to out-feature KhunLook on
general child health would lose. The defensible position is the narrow one the TOR actually
describes — early detection of puberty disorders, which KhunLook does not address at all.

This also sharpens [Q4](./client-questions.md#q4--what-is-the-ai-bone-age-actually-for--most-important):
if the bone-age feature is dropped or de-emphasised, GrowTH becomes a weaker KhunLook with a
questionnaire attached. The two differentiators are the whole case for the product.

---

## International comparators for the AI bone-age angle

For context on where automated bone age sits commercially. None of these target parents — they
are all clinician tools sold to hospitals, which is itself an argument about who GrowTH's user
really is.

| Product | Who it is for | Note |
| --- | --- | --- |
| **BoneXpert** (Visiana, Denmark) | radiology departments | CE-marked, the de-facto clinical standard; reports Greulich-Pyle and Tanner-Whitehouse |
| **VUNO Med-BoneAge** (Korea) | hospitals | Korean MFDS approved; published reader-agreement studies |
| **16 Bit Rho** (Canada) | radiologists | grew out of the RSNA Pediatric Bone Age Challenge — the same dataset our TOR §3.4 specifies |

**What to take from this:** every commercial bone-age product is a *clinician* tool. A
parent-facing bone-age estimate is unusual, which cuts both ways — it may be a real gap, or it
may be a sign the parent is the wrong user for this feature. Worth raising directly at Q4.

The RSNA challenge literature also gives us our MAE benchmark: leading entries reached roughly
**4–5 months** mean absolute error. TOR §6.3 requires us to report our MAE against comparable
published approaches, so this is the number to compare to — and to be honest about if we land
well above it.

---

## Suggested slide for the client

> KhunLook covers general child health with Thai MOPH standards and clinical validation behind
> it. GrowTH does not compete with that and should not try. GrowTH covers the one thing
> KhunLook does not: structured screening for puberty disorders, with bone age as supporting
> evidence. That is a narrow product — and narrow is the only thing that is achievable by
> 2 November with the resources we have.

---

## Still to do

- [ ] Install KhunLook and walk its actual growth-entry flow — everything above is from
      published papers and store listings, not hands-on use
- [ ] Check whether it has added puberty features since the 2023 RCT
- [ ] Find any Thai app that *does* do puberty screening — we have not found one, and if that
      holds it is a strong line for the pitch
