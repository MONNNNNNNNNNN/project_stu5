# 2D animation briefs — replacing walls of text

Every screen in GrowTH explains itself in paragraphs. Several of those explanations are
sequences or comparisons, which a short loop shows faster and more clearly than a sentence
does. This is the list of them, one brief per section, ready to hand to a designer or paste
into a generation tool.

## House rules

Applies to all of them:

- **Style:** flat 2D vector, rounded geometry, generous whitespace. No gradients, no 3D, no
  photographic texture.
- **Palette:** the app's own. Teal `#2f7566` (light) / `#5fe4d4` (dark), cream `#fdfbf7`, ink
  `#1f2937`. Accent amber `#d69e2e` **only** where something needs attention.
- **Length:** 3–5 seconds, seamless loop, no text baked into the frames — copy stays in the DOM
  so it can be translated and read by a screen reader.
- **Format:** Lottie JSON preferred (small, crisp at any size, themeable). SVG + CSS acceptable
  for the simplest ones. Avoid GIF — the palette banding is visible on our cream background.
- **Motion budget:** slow and calm. Nothing bounces, nothing flashes. Parents open this app
  worried; energetic motion reads as alarm.
- ⚠️ **Every animation must be paired with the text it replaces, not delete it.** Ship them
  behind `prefers-reduced-motion` with a static first frame as the fallback. This is a health
  app; motion cannot be the only way information is conveyed (WCAG 1.4.1, 2.3.3).
- **No child's face, no bodies, no clinical imagery.** Silhouettes and abstract shapes only.
  This matters for the puberty section especially.

---

## 1. Home — what GrowTH does

**Replaces:** the three-paragraph explainer on the landing page.

> A single continuous line draws itself left to right, rising gently like a growth curve. As it
> travels it passes three small milestone dots. At each dot a tiny icon fades up above the line
> — a ruler, then a calendar, then a hand X-ray outline — holds for a beat, and fades out as the
> line moves on. The line completes, settles, and the loop restarts. Flat vector, teal line on
> cream, 4 seconds, seamless.

**Why it beats the text:** the product is three features in a sequence over time. That is
exactly what a moving line along an axis says without a word.

---

## 2. Dashboard — how to read the percentile bands

**Replaces:** "Dashed lines are the 3rd and 50th percentile, the 95th (obesity) and 120% of the
95th (severe obesity)…"

> A simplified chart frame. Five horizontal colour zones fade in from the bottom upward — blue,
> green, yellow, orange, red — each holding briefly as it appears. A single dot then travels
> along a gentle curve through the green zone, pauses in the middle, and the green band pulses
> once, softly. Loop. No axis numbers, no labels.

**Why:** the bands are the one genuinely novel idea on the dashboard, and right now they are
explained in a sentence longer than the chart is tall.

---

## 3. Growth — measuring a child correctly

**Replaces:** the length-versus-stature caveat, which is currently a footnote nobody reads.

> Two side-by-side silhouettes of a small child, flat and faceless. On the left the child lies
> down and a measuring bar extends along their length. On the right the child stands against a
> wall and the bar extends upward. A small dashed line highlights the ~0.7 cm difference
> between the two results. Crossfade between the two, 5 seconds.

**Why:** the difference between recumbent length and standing stature is genuinely confusing in
words and obvious in a picture. It also quietly teaches the parent to measure consistently,
which improves the data.

---

## 4. Puberty — why "not sure" is a real answer

**Replaces:** the intro bullet explaining that "not sure" is valid.

> Three answer chips — Yes, No, Not sure — sit in a row. A cursor moves toward "No", hesitates,
> and moves instead to "Not sure", which fills with a calm teal. A small tick appears beside it.
> Deliberately unhurried, 4 seconds.

**Why:** this is the single most important behavioural change in the questionnaire, and the
whole point is that the parent should not feel they are failing by choosing it. Motion can
convey "this is fine" in a way a sentence claiming it cannot.

⚠️ Nothing anatomical. No body, no stages, no Tanner imagery.

---

## 5. Puberty — the follow-up plan

**Replaces:** the paragraph explaining the 4-month, 3-round schedule.

> A horizontal timeline with three evenly spaced markers. The first fills teal. A gentle arc
> sweeps to the second, which fills. Another arc to the third. All three then glow briefly
> together and a small document icon rises above the timeline. Loop.

**Why:** it's a schedule. Timelines are what schedules look like.

---

## 6. Bone age — what the AI actually does

**Replaces:** the two-paragraph value-proposition explainer, which is the longest block of text
in the app.

> A hand X-ray outline appears. A soft scan line passes down it once. Two age markers surface
> below: a solid one labelled by position as chronological age, and a second, slightly offset
> one. A small bracket appears between them showing the gap. Hold, fade, loop. Cool blue-grey
> for the X-ray, teal for the markers.

**Why:** the concept — *bone age is a second, different age, and the gap is what matters* — is
the thing users misunderstand most, and a bracket between two markers states it instantly.

⚠️ Use a stylised vector outline. **Do not** use a real radiograph or trace one from an atlas;
TOR §3.4 forbids reproducing copyrighted atlas images.

---

## 7. Bone age — uncertainty

**Replaces:** "typical error about 9 months, and roughly one estimate in four is out by more
than a year."

> A single age marker on a line. A soft translucent band expands outward from it either side,
> settles at its width, and breathes very slightly. Four small dots appear along the line; three
> land inside the band, one lands clearly outside it. Hold on that arrangement, loop.

**Why:** "one in four is out by more than a year" is a statistical claim most people will skim.
Three dots in, one dot out is the same claim and cannot be skimmed.

---

## 8. Empty states

**Replaces:** "No uploads yet", "No measurements yet", and similar bare lines.

> A dotted outline container with a small icon inside it drifting up and down by a few pixels,
> very slowly. On the growth version, a faint chart axis with one dot fading in and out where
> the first measurement would go.

**Why:** an empty screen currently reads as broken. A tiny amount of motion says "waiting for
you" rather than "nothing here".

---

## 9. Cold start

**Replaces:** the "the server may still be starting up" notice.

> Three dots in a row pulse in sequence, left to right, with a slow easing. Under them a very
> slowly filling progress bar that never quite completes. Calm, not urgent.

**Why:** the free-tier backend takes about a minute to wake. A static sentence during a
60-second wait reads as a hang; gentle continuous motion reads as progress.

---

## Priority

If only three get made, make these:

1. **§6 bone age** — replaces the most text and clears up the most common misunderstanding.
2. **§2 percentile bands** — the newest concept on the busiest screen.
3. **§4 "not sure"** — carries a behaviour change the screening's accuracy depends on.

## Where each one goes

| # | File |
| --- | --- |
| 1 | `frontend/src/pages/Home.tsx` |
| 2 | `frontend/src/components/PercentileChart.tsx` (caption area) |
| 3 | `frontend/src/pages/GrowthTracking.tsx` (form) |
| 4, 5 | `frontend/src/pages/PubertyQuestionnaire.tsx` |
| 6, 7 | `frontend/src/pages/BoneAgeUpload.tsx` |
| 8 | wherever an empty list renders |
| 9 | `frontend/src/components/ColdStartNotice.tsx` |

## Implementation note

`lottie-react` is about 60 KB gzipped and the bundle is already over 500 KB, so lazy-load the
player and the JSON per route rather than importing them at the top level. A static SVG first
frame should render immediately, with the animation swapped in once loaded — that also gives
the reduced-motion fallback for free.
