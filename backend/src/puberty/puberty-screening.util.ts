import { ChildSex } from '@prisma/client';
import { PubertyAnswersDto, SignAnswer } from './dto/submit-puberty-screening.dto';

/**
 * Age cutoffs for precocious and delayed puberty. Used only to raise a screening signal —
 * never presented as a diagnosis.
 *
 * These are the international (Western) figures, kept deliberately rather than swapped for
 * Thai data: the growth reference is CDC 2000 and the bone-age model is trained on a US
 * population, so all three quote one baseline instead of three. That decision, and its cost,
 * are recorded in docs/research-checklist.md A1 — a Khon Kaen University study found Thai
 * girls' observed menarche range ends at 14.0 years, so the delayed flag at 15 fires a year
 * later than local data would, which is a risk of missing a case rather than over-flagging.
 *
 * Precocious thresholds (8 girls, 9 boys) — Latronico AC, Brito VN, Carel JC. "Causes,
 * diagnosis, and treatment of central precocious puberty." Lancet Diabetes Endocrinol 2016;
 * PMID 26852255. Checked 2026-08-21.
 *
 * ⚠️ The three delayed thresholds below are NOT yet sourced. They are the conventional
 * figures and match what the TOR's background describes, but no citation has been recorded
 * for them, which the research checklist's own rules do not allow for a number shown to a
 * parent. Tracked in docs/research-checklist.md A1. Do not invent one.
 */
const PRECOCIOUS_AGE_FEMALE = 8;
const PRECOCIOUS_AGE_MALE = 9;
const DELAYED_AGE_FEMALE_BREAST = 13;
const DELAYED_AGE_FEMALE_MENARCHE = 15;
const DELAYED_AGE_MALE = 14;

/**
 * Guideline-recommended re-assessment interval when early signs are present: periodic
 * review every 4-6 months, tracking growth velocity and pubertal stage, is what
 * distinguishes slowly-progressive from rapidly-progressive puberty. We schedule at the
 * short end so a family is never told to wait longer than a clinician would.
 */
export const FOLLOW_UP_INTERVAL_MONTHS = 4;

/** How many reviews the in-app plan covers before it wraps up with a summary. */
export const FOLLOW_UP_ROUNDS = 3;

export type PubertyOutcome =
  /** Age-appropriate and nothing has started yet. */
  | 'NO_SIGNS_YET'
  /** Signs present, and they began at a typical age. */
  | 'TYPICAL_ONSET'
  /** Signs began before the precocious-puberty threshold for this child's sex. */
  | 'EARLY_SIGNS'
  /** Past the age by which puberty would normally have begun, with no signs reported. */
  | 'DELAYED_ONSET'
  /**
   * The parent does not know enough about the signs that would decide this.
   *
   * Distinct from NO_SIGNS_YET on purpose. "I have not seen it" and "I would not have seen
   * it" produce the same empty checkbox but mean opposite things, and only one of them is
   * evidence. Reporting the second as a delayed-development flag is how a screening tool
   * sends the wrong family to a doctor.
   */
  | 'INSUFFICIENT_INFO';

export interface PubertyScreeningResult {
  outcome: PubertyOutcome;
  title: string;
  summary: string;
  signsReported: string[];
  /** True when the result warrants a conversation with a doctor. */
  flagged: boolean;
  flagReason: string | null;
  /** Plain-language next steps shown under the result. */
  guidance: string[];
  /** True when the recommendation is to book an appointment rather than self-monitor. */
  seeDoctor: boolean;
}

/**
 * Age a sign began: the parent's reported onset age if they gave one, otherwise the
 * child's age right now. Falling back to "now" matters — a 6-year-old whose parent ticks
 * "breast development" without filling in an age has still reported an early sign, and an
 * earlier version of this only compared the optional field and so missed exactly that case.
 */
function onsetAge(reported: number | undefined, ageYearsNow: number): number {
  return reported !== undefined ? reported : ageYearsNow;
}

/**
 * Reads an answer that may be tri-state or a legacy boolean.
 *
 * Screenings are stored as raw JSON and recompiled on every read, so this function sees every
 * record ever written. Before tri-state answers existed, a missing key meant an unchecked box
 * meant "no" — that mapping is preserved exactly, so no historical result changes.
 */
function answered(value: SignAnswer | boolean | undefined): SignAnswer {
  if (value === true) return 'yes';
  if (value === 'yes' || value === 'unsure' || value === 'no') return value;
  return 'no';
}

const isYes = (v: SignAnswer | boolean | undefined) => answered(v) === 'yes';
const isUnsure = (v: SignAnswer | boolean | undefined) => answered(v) === 'unsure';

/**
 * The signs that decide a *delayed* outcome, per sex. If the parent is unsure about the one
 * that would raise the flag, we have not learned anything and must say so rather than flag.
 */
function decidingSignsUnknown(sex: ChildSex, answers: PubertyAnswersDto): boolean {
  return sex === 'FEMALE'
    ? isUnsure(answers.breastDevelopment) || isUnsure(answers.menstruation)
    : isUnsure(answers.testicularOrGenitalEnlargement);
}

/** Indirect signs a parent who is not with the child daily can still answer. */
function indirectSignsReported(answers: PubertyAnswersDto): string[] {
  const out: string[] = [];
  if (isYes(answers.rapidClothingOrShoeSizeChange))
    out.push('Outgrowing clothes or shoes unusually fast');
  if (isYes(answers.bodyOdourChange)) out.push('Adult-type body odour');
  if (isYes(answers.acne)) out.push('Acne');
  return out;
}

export function compilePubertyResult(
  sex: ChildSex,
  ageYearsNow: number,
  answers: PubertyAnswersDto,
): PubertyScreeningResult {
  const signs: string[] = [];
  const precociousAge = sex === 'FEMALE' ? PRECOCIOUS_AGE_FEMALE : PRECOCIOUS_AGE_MALE;

  let earlyReason: string | null = null;
  let delayedReason: string | null = null;
  let anyPrimarySign = false;

  if (sex === 'FEMALE') {
    if (isYes(answers.breastDevelopment)) {
      anyPrimarySign = true;
      const age = onsetAge(answers.breastDevelopmentAgeYears, ageYearsNow);
      signs.push(
        answers.breastDevelopmentAgeYears
          ? `Breast development (~age ${answers.breastDevelopmentAgeYears})`
          : 'Breast development',
      );
      if (age < PRECOCIOUS_AGE_FEMALE) {
        earlyReason = `Breast development before age ${PRECOCIOUS_AGE_FEMALE}, which is earlier than typical.`;
      }
    }
    if (isYes(answers.menstruation)) {
      anyPrimarySign = true;
      const age = onsetAge(answers.menstruationAgeYears, ageYearsNow);
      signs.push(
        answers.menstruationAgeYears
          ? `Menstruation began (~age ${answers.menstruationAgeYears})`
          : 'Menstruation began',
      );
      if (age < PRECOCIOUS_AGE_FEMALE + 1) {
        earlyReason = earlyReason ?? 'Menstruation reported at an unusually early age.';
      }
    }
    if (answered(answers.breastDevelopment) === 'no' && ageYearsNow >= DELAYED_AGE_FEMALE_BREAST) {
      delayedReason = `No breast development reported by age ${DELAYED_AGE_FEMALE_BREAST}, which is later than typical.`;
    } else if (answered(answers.menstruation) === 'no' && ageYearsNow >= DELAYED_AGE_FEMALE_MENARCHE) {
      delayedReason = `No menstruation reported by age ${DELAYED_AGE_FEMALE_MENARCHE}, which is later than typical.`;
    }
  } else {
    if (isYes(answers.testicularOrGenitalEnlargement)) {
      anyPrimarySign = true;
      const age = onsetAge(answers.testicularOrGenitalEnlargementAgeYears, ageYearsNow);
      signs.push(
        answers.testicularOrGenitalEnlargementAgeYears
          ? `Testicular/genital enlargement (~age ${answers.testicularOrGenitalEnlargementAgeYears})`
          : 'Testicular/genital enlargement',
      );
      if (age < PRECOCIOUS_AGE_MALE) {
        earlyReason = `Testicular or genital enlargement before age ${PRECOCIOUS_AGE_MALE}, which is earlier than typical.`;
      }
    }
    if (isYes(answers.voiceDeepening)) {
      anyPrimarySign = true;
      signs.push('Voice deepening');
      if (ageYearsNow < PRECOCIOUS_AGE_MALE) {
        earlyReason = earlyReason ?? `Voice deepening before age ${PRECOCIOUS_AGE_MALE}, which is earlier than typical.`;
      }
    }
    if (answered(answers.testicularOrGenitalEnlargement) === 'no' && ageYearsNow >= DELAYED_AGE_MALE) {
      delayedReason = `No testicular or genital enlargement reported by age ${DELAYED_AGE_MALE}, which is later than typical.`;
    }
  }

  if (isYes(answers.pubicOrBodyHairGrowth)) {
    const age = onsetAge(answers.pubicOrBodyHairGrowthAgeYears, ageYearsNow);
    signs.push(
      answers.pubicOrBodyHairGrowthAgeYears
        ? `Pubic/underarm/body hair growth (~age ${answers.pubicOrBodyHairGrowthAgeYears})`
        : 'Pubic/underarm/body hair growth',
    );
    if (age < precociousAge) {
      earlyReason = earlyReason ?? `Pubic or body hair growth before age ${precociousAge}, which is earlier than typical.`;
    }
  }
  if (isYes(answers.growthSpurt)) signs.push('Noticeable recent increase in height growth rate');
  if (isYes(answers.behavioralMoodSkinChanges)) signs.push('Behavioral, mood, or skin changes noted');
  signs.push(...indirectSignsReported(answers));

  // A delayed flag rests entirely on a sign being *absent*. If the parent told us they do not
  // know, absence was never established, and reporting it as delayed development would be
  // inventing evidence. An early flag is different — it rests on something positively
  // reported, so an unsure answer elsewhere does not undermine it.
  if (!earlyReason && decidingSignsUnknown(sex, answers)) {
    const indirect = indirectSignsReported(answers);
    const worthLooking = indirect.length > 0;
    return {
      outcome: 'INSUFFICIENT_INFO',
      title: 'Not enough information to say',
      summary:
        'Some of the questions that would decide this were answered "not sure", so this ' +
        'screening cannot reach a result. That is a perfectly reasonable answer — several of ' +
        'these signs are not visible unless you are with the child every day.' +
        (worthLooking
          ? ` You did report: ${indirect.join('; ')}. Those are worth mentioning to a doctor even on their own.`
          : ''),
      signsReported: signs,
      flagged: false,
      flagReason: null,
      seeDoctor: worthLooking,
      guidance: [
        worthLooking
          ? 'Mention what you did notice at your next routine appointment. Indirect changes like these are useful to a doctor even without the rest.'
          : 'Nothing here needs action, because nothing here has been established either way.',
        'If someone else sees the child more often — the other parent, a grandparent, a school nurse — they may be able to answer what you were unsure about. There is a field to record who answered. Do not examine the child to fill this in; a doctor can check properly in a few seconds.',
        'Keep recording height. Growth rate is measurable without close observation, and a growth spurt is one of the more reliable early signals.',
        'Re-run this screening whenever you are able to answer more of it.',
      ],
    };
  }

  if (earlyReason) {
    return {
      outcome: 'EARLY_SIGNS',
      title: 'Signs of early puberty',
      summary: `${earlyReason} Signs reported: ${signs.join('; ')}.`,
      signsReported: signs,
      flagged: true,
      flagReason: earlyReason,
      seeDoctor: true,
      guidance: [
        'Book an appointment with a pediatrician. Early signs are worth assessing properly, and only a clinical examination can tell whether puberty is actually progressing.',
        'Keep recording height regularly. A rising growth rate is one of the things the doctor will want to see, and your chart here is the easiest way to show it.',
        `Repeat this screening about every ${FOLLOW_UP_INTERVAL_MONTHS} months so changes between visits are written down rather than remembered.`,
        'Many children with early signs turn out to have slowly-progressive or non-progressive puberty that needs no treatment — this is a reason to get it checked, not a reason to panic.',
      ],
    };
  }

  if (delayedReason) {
    return {
      outcome: 'DELAYED_ONSET',
      title: 'Later than the typical range',
      summary: delayedReason,
      signsReported: signs,
      flagged: true,
      flagReason: delayedReason,
      seeDoctor: true,
      guidance: [
        'Mention this to a pediatrician at your next visit. Late puberty is very often a normal family pattern, but it is worth confirming.',
        'A family history of late development is useful information to bring — it is one of the first things a doctor will ask about.',
        'Keep tracking height so the growth pattern is available at the appointment.',
      ],
    };
  }

  if (anyPrimarySign || signs.length > 0) {
    return {
      outcome: 'TYPICAL_ONSET',
      title: 'Developing within the typical range',
      summary: `Signs reported: ${signs.join('; ')}. These are appearing within the age range usually expected for ${sex === 'FEMALE' ? 'girls' : 'boys'}.`,
      signsReported: signs,
      flagged: false,
      flagReason: null,
      seeDoctor: false,
      guidance: [
        'Nothing here needs action. Puberty appears to be starting on a typical schedule.',
        'Expect a growth spurt around this stage — keep adding height measurements so you can see it on the chart.',
        'Re-run this screening if something changes noticeably, or at your next routine check-up.',
      ],
    };
  }

  return {
    outcome: 'NO_SIGNS_YET',
    title: 'No signs of puberty yet',
    summary: `No signs of pubertal development reported. At ${ageYearsNow.toFixed(1)} years, that is expected.`,
    signsReported: [],
    flagged: false,
    flagReason: null,
    seeDoctor: false,
    guidance: [
      'Nothing to do right now. Puberty has not started, which is normal at this age.',
      `Worth checking again if you notice any of the signs in this questionnaire, or by around age ${sex === 'FEMALE' ? DELAYED_AGE_FEMALE_BREAST : DELAYED_AGE_MALE} if nothing has changed.`,
      'Keep recording height so the growth chart is ready when the spurt does begin.',
    ],
  };
}

export interface MonitoringStep {
  round: number;
  /** ISO date the round was completed, or null if it hasn't happened yet. */
  completedAt: string | null;
  /** ISO date this round becomes due — only set for the next pending round. */
  dueAt: string | null;
  outcome: PubertyOutcome | null;
}

export interface MonitoringPlan {
  active: boolean;
  totalRounds: number;
  completedRounds: number;
  steps: MonitoringStep[];
  /** Set once every round is done. */
  conclusion: { title: string; summary: string; guidance: string[] } | null;
}

/**
 * Builds the follow-up schedule shown after a screening flags early signs.
 *
 * This is a record-keeping aid, not a substitute for care: the EARLY_SIGNS result tells
 * the parent to book an appointment now, and the plan exists so they arrive with dated
 * observations instead of recollections.
 *
 * `screenings` must be ordered newest first, matching what the history endpoint returns.
 */
export function buildMonitoringPlan(
  screenings: { assessedAt: Date; result: PubertyScreeningResult }[],
): MonitoringPlan {
  const firstEarlyIndex = screenings.map((s) => s.result.outcome).lastIndexOf('EARLY_SIGNS');
  if (firstEarlyIndex === -1) {
    return { active: false, totalRounds: FOLLOW_UP_ROUNDS, completedRounds: 0, steps: [], conclusion: null };
  }

  // Oldest first, from the screening that first raised the flag.
  const tracked = screenings.slice(0, firstEarlyIndex + 1).reverse();
  const steps: MonitoringStep[] = tracked.slice(0, FOLLOW_UP_ROUNDS).map((s, i) => ({
    round: i + 1,
    completedAt: s.assessedAt.toISOString(),
    dueAt: null,
    outcome: s.result.outcome,
  }));

  const completedRounds = steps.length;

  for (let round = completedRounds + 1; round <= FOLLOW_UP_ROUNDS; round++) {
    const previous = round === completedRounds + 1 ? tracked[tracked.length - 1].assessedAt : null;
    const dueAt = previous ? new Date(previous) : null;
    if (dueAt) dueAt.setMonth(dueAt.getMonth() + FOLLOW_UP_INTERVAL_MONTHS);
    steps.push({ round, completedAt: null, dueAt: dueAt ? dueAt.toISOString() : null, outcome: null });
  }

  let conclusion: MonitoringPlan['conclusion'] = null;
  if (completedRounds >= FOLLOW_UP_ROUNDS) {
    // Judge on the follow-ups only. Round 1 is the screening that raised the flag, so it
    // is always EARLY_SIGNS — including it would make the reassuring conclusion
    // unreachable no matter how the child actually developed.
    const followUps = tracked.slice(1, FOLLOW_UP_ROUNDS);
    const stillEarly = followUps.some((s) => s.result.outcome === 'EARLY_SIGNS');
    conclusion = stillEarly
      ? {
          title: 'Follow-up complete — keep your doctor in the loop',
          summary:
            'Early signs were still being reported across the full follow-up period. That pattern is exactly what a pediatric endocrinologist needs to see.',
          guidance: [
            'Bring this screening history to your next appointment — dated observations over a year are far more useful than a single snapshot.',
            'If you have not yet seen a specialist about this, now is the time to ask for a referral.',
            'Keep recording height. Growth velocity across this period is a key part of the picture.',
          ],
        }
      : {
          title: 'Follow-up complete — development settled into the typical range',
          summary:
            'Across the follow-up period the early signs did not continue to progress, and the most recent screenings fall within the typical range. This is a common and reassuring outcome.',
          guidance: [
            'No further follow-up rounds are scheduled. You can re-run a screening any time something changes.',
            'Still mention the earlier findings at your next routine check-up so they are on record.',
            'Keep tracking height through the growth spurt.',
          ],
        };
  }

  return { active: true, totalRounds: FOLLOW_UP_ROUNDS, completedRounds, steps, conclusion };
}
