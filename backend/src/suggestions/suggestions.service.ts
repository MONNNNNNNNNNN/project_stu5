import { Injectable } from '@nestjs/common';
import { ChildSex } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { GrowthReferenceService } from '../growth/growth-reference.service';
import { nutritionalStatusKey } from '../growth/growth.service';
import {
  compilePubertyResult,
  FOLLOW_UP_INTERVAL_MONTHS,
} from '../puberty/puberty-screening.util';
import type { PubertyAnswersDto } from '../puberty/dto/submit-puberty-screening.dto';

/**
 * The connective tissue between Growth, Puberty and Bone Age.
 *
 * The client's review said the three menus "aren't related", and they were right — each was a
 * parallel screen that never referenced the others. That is a clinical problem as much as a
 * product one: a bone age two years ahead means very little without knowing whether the child
 * is growing fast and showing pubertal signs, and reading the three together is exactly what a
 * paediatric endocrinologist does. TOR FR-19 says the same.
 *
 * Everything here is a **suggestion**, never a block. The client asked for a "required"
 * screening when growth crosses a threshold; a medical questionnaire a parent cannot skip is a
 * reason to close the app, and we would lose the growth tracking that was working. It is also
 * inconsistent with every other output in this product being a screening aid rather than a
 * diagnosis. Whether these are dismissible is client question Q8.
 */

/**
 * How far ahead of chronological age a bone age has to be before it is worth raising.
 *
 * ⚠️ Two years is the conventional figure in paediatric endocrinology, but **this repo has no
 * source for it** — see research-checklist.md D3. It is also uncomfortably close to the
 * model's own error: MAE is 8.78 months and roughly one estimate in four is out by more than a
 * year, so a 24-month gap is only about two average errors wide. The copy this produces says
 * "worth asking about", never "your child has advanced bone age".
 */
const BONE_AGE_AHEAD_MONTHS = 24;

/**
 * Youngest age at which the puberty questionnaire is offered.
 *
 * ⚠️ **Provisional — this is client question Q7a.** The client asked that the screening only
 * be offered "once the child is old enough" but the specific age was not captured, and getting
 * it wrong costs something in both directions: gate too late and a genuinely early case is
 * never prompted before the threshold that would have caught it; gate too early and parents of
 * toddlers are asked clinically loaded questions with no relevance yet.
 *
 * Six is the defensible default rather than the precocious thresholds themselves (8 girls,
 * 9 boys). Gating at those ages would mean never prompting before the age that defines "early"
 * — which is precisely the case the feature exists to catch. Central precocious puberty is
 * rarely seen below about six.
 */
const PUBERTY_SCREENING_MIN_AGE_YEARS = 6;

/** Do not re-prompt a screening that was completed recently. */
const RESCREEN_AFTER_MONTHS = FOLLOW_UP_INTERVAL_MONTHS;

export type SuggestionKind =
  | 'PUBERTY_SCREENING'
  | 'BONE_AGE_UPLOAD'
  | 'BONE_AGE_REFERRAL'
  | 'PUBERTY_FOLLOW_UP';

export interface Suggestion {
  kind: SuggestionKind;
  /** `info` is a nudge; `warning` means something was flagged and needs a person. */
  severity: 'info' | 'warning';
  title: string;
  /** Why this is being suggested, in the parent's terms. Never a diagnosis. */
  body: string;
  actionLabel: string;
  /** Frontend route. Kept here so the reason and the destination cannot drift apart. */
  actionHref: string;
}

const monthsBetween = (from: Date, to: Date) =>
  (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);

@Injectable()
export class SuggestionsService {
  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
    private reference: GrowthReferenceService,
  ) {}

  async forChild(userId: string, childId: string): Promise<Suggestion[]> {
    await this.childrenService.assertGuardianAccess(childId, userId);

    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
    });
    const now = new Date();
    const ageYears = monthsBetween(child.dateOfBirth, now) / 12;

    const [latestGrowth, screenings, latestBoneAge] = await Promise.all([
      this.prisma.growthRecord.findFirst({
        where: { childId, deletedAt: null },
        orderBy: { measuredAt: 'desc' },
      }),
      this.prisma.pubertyScreening.findMany({
        where: { childId },
        orderBy: { assessedAt: 'desc' },
      }),
      this.prisma.boneAgePrediction.findFirst({
        where: { childId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const latestScreening = screenings[0];
    const latestResult = latestScreening
      ? compilePubertyResult(
          child.sex as ChildSex,
          monthsBetween(child.dateOfBirth, latestScreening.assessedAt) / 12,
          latestScreening.answers as PubertyAnswersDto,
        )
      : null;

    const out: Suggestion[] = [];

    // T1 — BMI out of range prompts a screening. The client's flow starts here: the growth
    // menu checks whether BMI is out of range, and that is what leads into puberty.
    //
    // Body composition and pubertal timing are associated in both directions — higher adiposity
    // with earlier onset, particularly in girls, and low weight with later onset. ⚠️ That link
    // is not yet cited in this repo; it is a team item on research-checklist.md D2, and the
    // wording below deliberately claims only that the two are worth looking at together.
    const bmiPercentile = latestGrowth?.bmiPercentile
      ? Number(latestGrowth.bmiPercentile)
      : null;
    const statusKey =
      bmiPercentile !== null
        ? nutritionalStatusKey(
            bmiPercentile,
            latestGrowth?.bmi ? Number(latestGrowth.bmi) : null,
            latestGrowth?.bmiPctOfP95 ? Number(latestGrowth.bmiPctOfP95) : null,
          )
        : null;

    const bmiOutOfRange =
      statusKey !== null && statusKey !== 'HEALTHY';
    const oldEnoughToScreen = ageYears >= PUBERTY_SCREENING_MIN_AGE_YEARS;
    const screenedRecently =
      latestScreening !== undefined &&
      monthsBetween(latestScreening.assessedAt, now) < RESCREEN_AFTER_MONTHS;

    if (bmiOutOfRange && oldEnoughToScreen && !screenedRecently) {
      const label =
        statusKey === 'UNDERWEIGHT'
          ? 'below the healthy range'
          : 'above the healthy range';
      out.push({
        kind: 'PUBERTY_SCREENING',
        severity: 'info',
        title: 'Worth checking puberty signs too',
        body:
          `${child.fullName}'s latest BMI is ${label}. Weight and the timing of puberty tend to ` +
          'move together, so this is a good moment to run the puberty screening — it takes ' +
          'about two minutes, and "not sure" is a valid answer to any of it.',
        actionLabel: 'Start puberty screening',
        actionHref: '/puberty',
      });
    }

    // T2 — early signs prompt a bone age. Bone age is what distinguishes rapidly-progressive
    // puberty from the slowly-progressive kind that needs no treatment, so it is the natural
    // next question once a screening has flagged something.
    const boneAgeSinceScreening =
      latestBoneAge &&
      latestScreening &&
      latestBoneAge.createdAt > latestScreening.assessedAt;

    if (latestResult?.outcome === 'EARLY_SIGNS' && !boneAgeSinceScreening) {
      out.push({
        kind: 'BONE_AGE_UPLOAD',
        severity: 'warning',
        title: 'If you have a hand X-ray, upload it',
        body:
          'The screening reported early signs. A bone age reading is what tells a doctor ' +
          'whether puberty is actually progressing quickly or just starting early — many ' +
          'children with early signs need no treatment at all. This does not replace the ' +
          'appointment; it gives you something to bring to it.',
        actionLabel: 'Upload X-ray',
        actionHref: '/bone-age',
      });
    }

    // T3 — a bone age well ahead of chronological age, read next to everything else.
    if (latestBoneAge?.predictedAgeMonths) {
      const chronoMonths = monthsBetween(child.dateOfBirth, latestBoneAge.createdAt);
      const gap = latestBoneAge.predictedAgeMonths - chronoMonths;
      if (gap >= BONE_AGE_AHEAD_MONTHS) {
        const years = (gap / 12).toFixed(1);
        out.push({
          kind: 'BONE_AGE_REFERRAL',
          severity: 'warning',
          title: 'Bone age is ahead of actual age',
          body:
            `The last reading put ${child.fullName}'s bone age about ${years} years ahead. ` +
            'That is worth asking a paediatrician about, especially alongside the growth chart ' +
            'and screening history. Bear in mind the estimate itself is approximate — typically ' +
            'out by around nine months, and sometimes by more than a year.',
          actionLabel: 'View growth chart',
          actionHref: '/growth',
        });
      }
    }

    // T4 — the follow-up plan already computes a due date and nothing ever surfaced it.
    if (latestResult?.outcome === 'EARLY_SIGNS' && latestScreening) {
      const since = monthsBetween(latestScreening.assessedAt, now);
      if (since >= FOLLOW_UP_INTERVAL_MONTHS) {
        out.push({
          kind: 'PUBERTY_FOLLOW_UP',
          severity: 'info',
          title: 'Follow-up screening is due',
          body:
            `It has been about ${Math.floor(since)} months since the screening that flagged ` +
            'early signs. Repeating it now means you arrive at the next appointment with dated ' +
            'observations rather than recollections.',
          actionLabel: 'Repeat screening',
          actionHref: '/puberty',
        });
      }
    }

    return out;
  }
}
