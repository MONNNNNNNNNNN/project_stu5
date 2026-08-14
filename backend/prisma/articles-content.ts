/**
 * Long-form body copy for the seeded Parenting Resources articles.
 *
 * Kept out of seed.ts so the seed script stays readable as a script. Figures here are
 * from published sources, cited at the bottom of each article; where sources disagree
 * (notably the age of peak height velocity, which recent cohorts put roughly a year
 * earlier than the classic figures) both are given rather than picking one silently.
 *
 * These are parent-education material, not clinical guidance — every article ends by
 * pointing at a pediatrician for anything that looks off.
 */

export const understandingBoneAge = `
## What "bone age" actually measures

Bone age is a reading of **skeletal maturity** — how far a child's bones have developed —
rather than how long they have been alive. It's assessed from a single X-ray of the left
hand and wrist, because the growing ends of those small bones (the growth plates) change
shape in a predictable order from infancy through the end of growth.

A radiologist compares that X-ray against a reference and reports an age. If a
9-year-old's bones look like the reference for an 11-year-old, their bone age is
"advanced" by about two years. If they look like a 7-year-old's, it's "delayed".

## How it's read

Two methods dominate clinical practice:

- **Greulich–Pyle (GP)** — the reader matches the whole hand against an atlas of reference
  radiographs and picks the closest match. It's fast and simple, which is why it's the
  most widely used method.
- **Tanner–Whitehouse (TW3)** — each individual bone is scored separately and the scores
  are summed. It takes longer but is more granular.

Increasingly these are assisted by automated software, which improves consistency between
readers.

## Why a doctor might order one

Bone age is not a routine test. It's requested when a specific question needs answering:

- **Predicting adult height.** Bone age tells you how much growing time is left. Two
  children the same height at the same age can have very different adult heights if one
  has far more growth remaining.
- **Investigating early or late puberty.** Sex hormones accelerate skeletal maturation, so
  a bone age running ahead of chronological age is one of the signals that supports a
  precocious puberty workup.
- **Investigating short stature or poor growth.** A delayed bone age in a short child
  often means growth is simply happening on a later schedule, with more time in hand than
  the current height suggests.

## What it can't tell you

- **It is not a diagnosis.** Bone age is one input among several — growth velocity,
  parental heights, pubertal stage, and blood work all matter.
- **Readings vary between readers.** Agreement between two radiologists reading the same
  film is good but not perfect, so small differences of a few months are not meaningful.
- **The reference population matters.** The GP atlas is built on radiographs of North
  American children collected in the 1930s and 40s. Applying it to contemporary children
  from different populations can introduce bias, which is a known limitation and an active
  area of research.
- **Height predictions are estimates.** They carry a real margin of error and become more
  reliable closer to the end of growth.

## What this means for you as a parent

If a bone age has been ordered, it is answering a question your doctor already has — it
is not a screening test to seek out on your own. Bring the report to the appointment along
with your child's height history; the trend over time is usually more informative than any
single number.

GrowTH's bone age feature is a **preliminary, non-diagnostic** tool and is clearly marked
as such. It does not replace a radiologist's reading.

---

### Sources

- [Near-Adult Heights and Adult Height Predictions Using Automated and Conventional Greulich–Pyle Bone Age Determinations](https://pmc.ncbi.nlm.nih.gov/articles/PMC9205833/) — PMC
- [Skeletal age in idiopathic short stature: an analytical study by the TW3 method, Greulich and Pyle method](https://pmc.ncbi.nlm.nih.gov/articles/PMC2911934/) — PMC
- [Bone Age Assessment Using Various Medical Imaging Techniques Enhanced by Artificial Intelligence](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11817689/) — PMC
- [Automatic assessment of bone age in Taiwanese children: GP vs TW3](https://onlinelibrary.wiley.com/doi/full/10.1002/kjm2.12268) — Kaohsiung Journal of Medical Sciences
`.trim();

export const nutritionForPreTeens = `
## Why ages 9–13 matter so much

More than half of adult bone mass is laid down during adolescence. The skeleton a child
builds in these years is roughly the skeleton they keep — bone that isn't built now is
very difficult to add later. At the same time, appetite and growth rate rise sharply, and
food choices start moving out of a parent's direct control.

This is the window where nutrition has the most leverage.

## The numbers that matter

| Nutrient | Ages 9–13 | Why |
| --- | --- | --- |
| Calcium | **1,300 mg/day** | Bone mineral density; the same target for boys and girls |
| Vitamin D | **600 IU (15 µg)/day** | Needed to absorb calcium at all |
| Protein | **10–30% of daily calories** | Tissue growth during the spurt |
| Iron | Rises in both sexes; higher in girls after menarche | Oxygen transport; deficiency is common |

Calcium, iron, zinc and vitamin D are the four that adolescents most often fall short on.

## Where to actually get them

**Calcium.** Milk, yoghurt and cheese are the densest sources. If dairy isn't part of your
family's diet, small fish eaten with the bones, firm tofu set with calcium, fortified soy
milk, and dark leafy greens such as kale, pak choi and Chinese broccoli all contribute
meaningfully.

**Vitamin D.** Few foods contain much. Oily fish, egg yolk and fortified milk are the main
dietary sources; sensible sun exposure covers the rest for most children. Children who are
mostly indoors, or who cover up outdoors, are the ones to watch.

**Iron.** Red meat, liver and blood-based dishes are absorbed best. Plant sources — beans,
tofu, dark greens — are absorbed far better when eaten with something high in vitamin C in
the same meal, so pairing them with citrus, tomato, guava or papaya genuinely helps.

**Protein.** Easy to meet in most diets: eggs, fish, chicken, pork, beans, tofu, nuts. Most
children in this age group are not short on protein, and supplements are rarely needed.

## Habits that matter more than any single nutrient

- **Don't skip breakfast.** It's the meal most often dropped at this age and the one that
  most reliably costs calcium and iron.
- **Watch what drinks replace.** Sweetened drinks displacing milk is one of the most common
  ways calcium intake quietly collapses.
- **Be careful with restrictive dieting.** Weight-loss dieting during the growth spurt can
  compromise both bone accrual and final height. If weight is a genuine concern, that's a
  conversation to have with a pediatrician rather than a diet to start at home.
- **Eat together where you can.** Shared meals are consistently associated with better diet
  quality in this age group.

## When to ask a professional

Talk to a pediatrician or dietitian if your child follows a restricted diet (vegan, multiple
allergies, strong food aversions), is persistently tired or pale, has dropped across growth
percentile lines, or if you're considering supplements. Supplement doses for children are
not scaled-down adult doses, and more is not better — particularly for vitamin D and iron,
both of which are harmful in excess.

---

### Sources

- [A Teenager's Nutritional Needs](https://www.healthychildren.org/English/ages-stages/teen/nutrition/Pages/A-Teenagers-Nutritional-Needs.aspx) — HealthyChildren.org (American Academy of Pediatrics)
- [Adolescents — Micronutrient Information Center](https://lpi.oregonstate.edu/mic/life-stages/adolescents) — Linus Pauling Institute, Oregon State University
- [Nutrition Through the Lifecycle: Adolescence](https://open.maricopa.edu/nutritionessentials/chapter/nutrition-through-the-lifecycle-adolescence/) — Nutrition Essentials
- [Take Charge of Your Health: A Guide for Teenagers](https://www.niddk.nih.gov/health-information/weight-management/take-charge-health-guide-teenagers) — NIDDK, National Institutes of Health
`.trim();

export const navigatingGrowthSpurts = `
## What a growth spurt is

For most of childhood, growth is slow and steady — roughly 5–6 cm a year. Puberty
interrupts that with a burst of rapid growth lasting about two to three years. The fastest
point in that burst is called **peak height velocity (PHV)**, and it is the quickest a
person will ever grow after infancy.

## When to expect it

**Girls** enter the spurt earlier — typically somewhere between about 9½ and 13½, with the
peak classically placed around 11½. **Boys** follow roughly two years later, with the spurt
falling somewhere between about 12 and 16 and the peak classically around 13½.

Recent cohorts suggest these milestones are arriving earlier than the classic figures — one
large analysis put peak growth at about 10.5 years for girls and 12.8 for boys. Either way,
the spread between individual children is wide, and being early or late is far more often
normal variation than a problem.

## How fast is fast

At the peak, growth reaches roughly **9.5 cm/year in boys** and **8.3 cm/year in girls**
measured across the whole peak year. In the single fastest year, a boy may gain more than
10 cm and a girl around 9 cm.

That is close to double the pre-pubertal rate, which is why it's so visible: clothes stop
fitting in months rather than years.

## What else comes with it

- **Feet and hands first.** They often finish growing before the rest, so shoe size can jump
  well ahead of height.
- **Appetite climbs steeply.** This is expected, not overeating.
- **Clumsiness.** Limb length changes faster than coordination adapts.
- **Aching legs.** Common in the evening, typically in both legs, and settling by morning.
- **More sleep.** Growth hormone is released mostly during deep sleep; the extra need is
  real.

## What's worth a doctor's attention

Most spurts need nothing but bigger shoes. Do raise it with a pediatrician if:

- growth **crosses downward through percentile lines** on the chart over successive
  measurements, rather than tracking along one
- height velocity in mid-childhood stays **below about 4–5 cm/year**
- signs of puberty appear **before age 8 in girls or 9 in boys** — this is the threshold at
  which precocious puberty is investigated
- there are **no** signs of puberty by 13 in girls or 14 in boys
- pain is **in one leg only**, wakes the child at night, or comes with limping or swelling —
  this is not a growing pain and should be looked at

## Getting useful data

A single measurement says very little; the *trend* is what carries information. Measure at
consistent intervals — every three to six months is plenty outside the spurt — at the same
time of day, barefoot, heels against a wall. Height is measurably greater in the morning
than the evening, so consistency matters more than precision.

That trend is exactly what GrowTH's growth chart is for: plotted against reference
percentile curves, a change in the *shape* of your child's line is visible long before it
would be obvious in the numbers alone.

---

### Sources

- [Growth and Normal Puberty](https://publications.aap.org/pediatrics/article/102/Supplement_3/507/28134/Growth-and-Normal-Puberty) — Pediatrics, American Academy of Pediatrics
- [Physical Growth and Sexual Maturation of Adolescents](https://www.merckmanuals.com/professional/pediatrics/growth-and-development/physical-growth-and-sexual-maturation-of-adolescents) — Merck Manual Professional Edition
- [What is a Growth Spurt During Puberty?](https://www.hopkinsmedicine.org/health/wellness-and-prevention/what-is-a-growth-spurt-during-puberty) — Johns Hopkins Medicine
- [Growth Spurts Occurring at Younger Ages for Both Girls and Boys](https://www.epicresearch.org/articles/growth-spurts-occurring-at-younger-ages-for-both-girls-and-boys/) — Epic Research
`.trim();
