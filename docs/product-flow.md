# Product flow and feature integration

Prepared 2026-08-18, answering three points from the client review:

- *"Function แต่ละเมนูไม่ related กัน"*
- *"Flow การใช้งานเป็นอย่างไร"*
- *"ทำอย่างไรให้ Puberty / Growth / AI prediction มีความสัมพันธ์กัน"*

**Everything here is a proposal for client approval, not built work.**

---

## The problem, stated plainly

Today the app has three clinical features that never mention each other:

```
Dashboard ──> Growth      : log height/weight, see percentile
          ──> Puberty     : answer questionnaire, see outcome
          ──> AI Bone Age : upload X-ray, see (eventually) an estimate
```

Three parallel menus. Nothing in Growth suggests a screening. Nothing in the screening result
suggests a bone age. The bone-age result is not shown next to the growth chart.

That is a product problem *and* a clinical one. **None of these three readings means much
alone.** A bone age two years ahead of chronological age is meaningless without knowing whether
the child is growing fast and showing pubertal signs. That combination is precisely what a
paediatric endocrinologist looks at — and it is what the TOR asks for in FR-19:

> *"The bone age feature is most clinically meaningful when considered alongside the child's
> growth and puberty screening history rather than in isolation."*

We built the three features. We did not build the "alongside".

---

## Proposed flow

```
                    ┌──────────────────────────────┐
                    │  Register → accept terms     │
                    │  → add child (name/sex/DOB)  │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │        DASHBOARD             │
                    │  one child, one story        │
                    └──────────────┬───────────────┘
                                   ▼
        ┌──────────────── log height / weight ─────────────────┐
        │                                                      │
        ▼                                                      ▼
   within range                                    outside ±2 SD, OR
        │                                     crossing percentile bands upward
        │                                                      │
        ▼                                                      ▼
   "typical range"                              ┌─────────────────────────────┐
   keep tracking                                │ SUGGEST: puberty screening  │
                                                │ "growth like this is worth  │
                                                │  checking alongside signs   │
                                                │  of puberty"                │
                                                └──────────────┬──────────────┘
                                                               ▼
                                                     puberty screening
                                                               │
                              ┌────────────────────────────────┼──────────────┐
                              ▼                                ▼              ▼
                        NO_SIGNS / TYPICAL              EARLY_SIGNS     DELAYED_ONSET
                              │                                │              │
                              ▼                                ▼              ▼
                     nothing to do              ┌──────────────────────┐  mention at
                     re-screen if changes       │ SUGGEST: bone age    │  next visit
                                                │ + see a doctor       │
                                                │ + 4-month follow-up  │
                                                └──────────┬───────────┘
                                                           ▼
                                                    bone age result
                                                           │
                                                           ▼
                                         ┌──────────────────────────────────┐
                                         │ COMBINED VIEW                    │
                                         │ chronological age  10y 4m        │
                                         │ bone age          12y 1m (±6m)   │
                                         │ height            P37, rising    │
                                         │ puberty           early signs    │
                                         │ → take this to a paediatrician   │
                                         └──────────────────────────────────┘
```

## Trigger rules

| # | Trigger | Action | Clinical rationale |
| --- | --- | --- | --- |
| T1 | height or weight SDS beyond ±2 | suggest puberty screening | growth deviation is a recognised presenting sign of a pubertal disorder |
| T2 | height crossing upward through percentile bands over 2+ measurements | suggest puberty screening | accelerating growth velocity is the classic early sign — often before any visible pubertal change |
| T3 | screening returns `EARLY_SIGNS` | suggest bone-age upload | bone age is what distinguishes rapidly-progressive from slowly-progressive puberty |
| T4 | bone age ≥ 2 years ahead of chronological age | surface on the growth chart, suggest referral | advanced skeletal maturation with early signs is the combination that matters |
| T5 | screening flagged, no follow-up in 4 months | remind | the existing `buildMonitoringPlan` already computes this date — nothing currently surfaces it |

**T5 is worth noting:** the follow-up schedule is already calculated and displayed, but nothing
reminds the parent when the date arrives. The `Notification` model, the bell, the badge and the
`/notifications` page all exist and are all permanently empty because **nothing in the backend
ever creates a notification**. T5 would be the first real producer — closing a dead feature and
adding the connective tissue in one change.

## Suggested, not required

The client asked for *"required puberty screening"* when growth crosses a threshold. We
recommend **suggested (dismissible)** instead, for three reasons:

1. A medical questionnaire a parent cannot skip is a reason to close the app. We lose the
   growth tracking too, which was working.
2. We cannot compel anyone, and pretending to sends the wrong message about what this tool is.
3. The TOR is consistent that outputs are a *"screening aid, not a diagnosis"*. A blocking
   requirement contradicts that framing.

A dismissible prompt that persists on the dashboard until acted on gets most of the benefit
without the cost. **This is [Q8](./client-questions.md#q8--should-the-features-trigger-each-other)
for the client to settle.**

---

## The AI question

> *"AI เข้ามาช่วยอะไร เหมือน User ก็ต้องไปโรงพยาบาลเพื่อเอกซเรย์เหมือนเดิม"*

**The client is right, and the app currently has no answer.**

An app cannot order an X-ray. If the user has to go to hospital anyway, and the hospital reads
the film, the AI adds nothing.

But that is not the situation the TOR describes. From §1:

> *"Bone age assessment using traditional methods, such as the Greulich-Pyle (GP)
> atlas-matching approach or the Tanner-Whitehouse (TW) scoring approach, is time-consuming,
> requires specialist training, and is subject to variability between different readers. In
> addition, many healthcare facilities in Thailand do not have ready access to a pediatric
> endocrinologist or a radiologist experienced in bone age reading, which can delay diagnosis
> and referral."*

The bottleneck is **not taking the film — it is finding someone qualified to read it.**

So the honest positioning is:

> GrowTH does not save you the hospital visit. It shortens the wait between having the X-ray
> and knowing whether it matters.

The realistic user is a parent whose child **already had a hand X-ray** — taken at a district
hospital for this or another reason — and who is now waiting weeks for a specialist
appointment to find out what it means.

**Three things follow if the client accepts this framing:**

1. **Say it in the product.** The bone-age screen currently opens with *"Upload a left-hand
   radiograph for an instant automated bone age estimation"*, which invites exactly the
   client's objection. It should say who this is for and what it does *not* replace.
2. **Target the right user.** Not "parents who suspect early puberty" — "parents who already
   have an X-ray and are waiting".
3. **Be honest about the limit.** Note that every comparable commercial product (BoneXpert,
   VUNO, 16 Bit) is sold to *radiologists*, not parents — see
   [`competitor-analysis.md`](./competitor-analysis.md). A parent-facing bone age is unusual.
   That is either our gap or our warning sign, and the client should decide which.

**If the client rejects the framing**, the bone-age feature needs rethinking before more effort
goes into it — which is much better to know in August than in October.

---

## What this changes if approved

Small, and mostly in the backend that already exists:

| Change | Where |
| --- | --- |
| Trigger evaluation T1–T4 | `growth.service.ts` guidance, `puberty.service.ts` result |
| Notification producer for T5 | new — first writer to the `Notification` model |
| Combined view | `Dashboard.tsx` — a panel that reads all three, rather than three separate cards |
| Copy changes | `BoneAgeUpload.tsx` intro, puberty result next-steps |

No schema change. No new dependency. The data to drive every trigger is already stored.

---

## Open questions

- [ ] Suggested or required? ([Q8](./client-questions.md#q8--should-the-features-trigger-each-other))
- [ ] Is the AI framing above the one to build toward? ([Q4](./client-questions.md#q4--what-is-the-ai-bone-age-actually-for--most-important))
- [ ] T4's "2 years ahead" threshold needs a clinical source — currently our own suggestion
- [ ] T2's "crossing percentile bands" needs a precise definition (how many bands, over how long)
