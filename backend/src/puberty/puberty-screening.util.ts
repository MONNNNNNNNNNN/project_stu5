import { ChildSex } from '@prisma/client';
import { PubertyAnswersDto } from './dto/submit-puberty-screening.dto';

// Widely-cited clinical age cutoffs for precocious/delayed puberty (referenced directly
// in the TOR's own background section). Used only to flag a screening signal — never
// presented as a diagnosis.
const PRECOCIOUS_AGE_FEMALE = 8;
const PRECOCIOUS_AGE_MALE = 9;
const DELAYED_AGE_FEMALE_BREAST = 13;
const DELAYED_AGE_FEMALE_MENARCHE = 15;
const DELAYED_AGE_MALE = 14;

export interface PubertyScreeningResult {
  summary: string;
  signsReported: string[];
  flagged: boolean;
  flagReason: string | null;
}

export function compilePubertyResult(
  sex: ChildSex,
  ageYearsNow: number,
  answers: PubertyAnswersDto,
): PubertyScreeningResult {
  const signs: string[] = [];
  let flagged = false;
  let flagReason: string | null = null;

  if (sex === 'FEMALE') {
    if (answers.breastDevelopment) {
      signs.push(
        answers.breastDevelopmentAgeYears
          ? `Breast development (~age ${answers.breastDevelopmentAgeYears})`
          : 'Breast development',
      );
      if (answers.breastDevelopmentAgeYears !== undefined && answers.breastDevelopmentAgeYears < PRECOCIOUS_AGE_FEMALE) {
        flagged = true;
        flagReason = `Breast development reported before age ${PRECOCIOUS_AGE_FEMALE}, which is earlier than typical.`;
      }
    }
    if (answers.menstruation) {
      signs.push(
        answers.menstruationAgeYears ? `Menstruation began (~age ${answers.menstruationAgeYears})` : 'Menstruation began',
      );
      if (answers.menstruationAgeYears !== undefined && answers.menstruationAgeYears < PRECOCIOUS_AGE_FEMALE + 1) {
        flagged = true;
        flagReason = 'Menstruation reported at an unusually early age.';
      }
    }
    if (!flagged && !answers.breastDevelopment && ageYearsNow >= DELAYED_AGE_FEMALE_BREAST) {
      flagged = true;
      flagReason = `No breast development reported by age ${DELAYED_AGE_FEMALE_BREAST}, which is later than typical.`;
    }
    if (!flagged && !answers.menstruation && ageYearsNow >= DELAYED_AGE_FEMALE_MENARCHE) {
      flagged = true;
      flagReason = `No menstruation reported by age ${DELAYED_AGE_FEMALE_MENARCHE}, which is later than typical.`;
    }
  } else {
    if (answers.testicularOrGenitalEnlargement) {
      signs.push(
        answers.testicularOrGenitalEnlargementAgeYears
          ? `Testicular/genital enlargement (~age ${answers.testicularOrGenitalEnlargementAgeYears})`
          : 'Testicular/genital enlargement',
      );
      if (
        answers.testicularOrGenitalEnlargementAgeYears !== undefined &&
        answers.testicularOrGenitalEnlargementAgeYears < PRECOCIOUS_AGE_MALE
      ) {
        flagged = true;
        flagReason = `Testicular/genital enlargement reported before age ${PRECOCIOUS_AGE_MALE}, which is earlier than typical.`;
      }
    }
    if (answers.voiceDeepening) signs.push('Voice deepening');
    if (!flagged && !answers.testicularOrGenitalEnlargement && ageYearsNow >= DELAYED_AGE_MALE) {
      flagged = true;
      flagReason = `No testicular/genital enlargement reported by age ${DELAYED_AGE_MALE}, which is later than typical.`;
    }
  }

  if (answers.pubicOrBodyHairGrowth) {
    signs.push(
      answers.pubicOrBodyHairGrowthAgeYears
        ? `Pubic/underarm/body hair growth (~age ${answers.pubicOrBodyHairGrowthAgeYears})`
        : 'Pubic/underarm/body hair growth',
    );
  }
  if (answers.growthSpurt) signs.push('Noticeable recent increase in height growth rate');
  if (answers.behavioralMoodSkinChanges) signs.push('Behavioral, mood, or skin changes noted');

  const summary =
    signs.length > 0
      ? `Signs reported: ${signs.join('; ')}.`
      : 'No signs of pubertal development reported yet.';

  return { summary, signsReported: signs, flagged, flagReason };
}
