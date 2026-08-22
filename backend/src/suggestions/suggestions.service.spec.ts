import { ChildSex } from '@prisma/client';
import { GrowthReferenceService } from '../growth/growth-reference.service';
import { ChildrenService } from '../children/children.service';
import { PrismaService } from '../prisma/prisma.service';
import { SuggestionsService } from './suggestions.service';

/**
 * The cross-feature triggers, tested against a stub Prisma.
 *
 * These decide what the app tells a parent to do next, so the interesting cases are the ones
 * where it must stay quiet: a healthy BMI, a child too young for the questionnaire, a
 * screening that ran last week.
 */
const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;
const monthsAgo = (n: number) => new Date(Date.now() - n * MONTH_MS);
const yearsAgo = (n: number) => monthsAgo(n * 12);

function build(opts: {
  sex?: ChildSex;
  ageYears?: number;
  bmi?: { value: number; percentile: number; pctOfP95: number } | null;
  screening?: { answers: Record<string, unknown>; monthsAgo: number } | null;
  boneAge?: { predictedAgeMonths: number; monthsAgo: number } | null;
}) {
  const child = {
    id: 'c1',
    fullName: 'Test Child',
    sex: (opts.sex ?? 'FEMALE') as ChildSex,
    dateOfBirth: yearsAgo(opts.ageYears ?? 10),
  };

  const prisma = {
    child: { findUniqueOrThrow: async () => child },
    growthRecord: {
      findFirst: async () =>
        opts.bmi
          ? {
              bmi: opts.bmi.value,
              bmiPercentile: opts.bmi.percentile,
              bmiPctOfP95: opts.bmi.pctOfP95,
            }
          : null,
    },
    pubertyScreening: {
      findMany: async () =>
        opts.screening
          ? [{ answers: opts.screening.answers, assessedAt: monthsAgo(opts.screening.monthsAgo) }]
          : [],
    },
    boneAgePrediction: {
      findFirst: async () =>
        opts.boneAge
          ? {
              predictedAgeMonths: opts.boneAge.predictedAgeMonths,
              createdAt: monthsAgo(opts.boneAge.monthsAgo),
            }
          : null,
    },
  } as unknown as PrismaService;

  const children = { assertGuardianAccess: async () => undefined } as unknown as ChildrenService;
  return new SuggestionsService(prisma, children, new GrowthReferenceService());
}

const kinds = async (svc: SuggestionsService) =>
  (await svc.forChild('u1', 'c1')).map((s) => s.kind);

describe('SuggestionsService', () => {
  describe('BMI prompts a puberty screening', () => {
    // Obesity-range BMI for a ten-year-old girl.
    const obese = { value: 28.4, percentile: 99.1, pctOfP95: 128.5 };

    it('suggests a screening when BMI is out of range', async () => {
      expect(await kinds(build({ bmi: obese }))).toContain('PUBERTY_SCREENING');
    });

    it('stays quiet when BMI is healthy', async () => {
      const healthy = { value: 16.5, percentile: 46.6, pctOfP95: 74.4 };
      expect(await kinds(build({ bmi: healthy }))).not.toContain('PUBERTY_SCREENING');
    });

    it('stays quiet for a child below the screening age', async () => {
      // Client question Q7a. Asking a four-year-old's parent about menstruation is the failure
      // mode the age gate exists to prevent.
      expect(await kinds(build({ bmi: obese, ageYears: 4 }))).not.toContain('PUBERTY_SCREENING');
    });

    it('does not nag when a screening was done recently', async () => {
      const recent = { answers: {}, monthsAgo: 1 };
      expect(await kinds(build({ bmi: obese, screening: recent }))).not.toContain('PUBERTY_SCREENING');
    });

    it('prompts again once the screening has gone stale', async () => {
      const old = { answers: {}, monthsAgo: 9 };
      expect(await kinds(build({ bmi: obese, screening: old }))).toContain('PUBERTY_SCREENING');
    });

    it('stays quiet when there is no BMI yet', async () => {
      // Under five, BMI-for-age does not apply at all.
      expect(await kinds(build({ bmi: null, ageYears: 3 }))).toHaveLength(0);
    });
  });

  describe('early signs prompt a bone age', () => {
    const early = { answers: { breastDevelopment: 'yes', breastDevelopmentAgeYears: 6 }, monthsAgo: 1 };

    it('suggests an upload after an early-signs screening', async () => {
      expect(await kinds(build({ screening: early }))).toContain('BONE_AGE_UPLOAD');
    });

    it('stops suggesting once an X-ray has been read since', async () => {
      const after = { predictedAgeMonths: 130, monthsAgo: 0 };
      expect(await kinds(build({ screening: early, boneAge: after }))).not.toContain('BONE_AGE_UPLOAD');
    });

    it('does not suggest one when the screening found nothing', async () => {
      const typical = { answers: { breastDevelopment: 'no' }, monthsAgo: 1 };
      expect(await kinds(build({ screening: typical }))).not.toContain('BONE_AGE_UPLOAD');
    });

    // An unsure answer must not act like a result in either direction.
    it('does not suggest one when the parent was unsure', async () => {
      const unsure = { answers: { breastDevelopment: 'unsure' }, monthsAgo: 1 };
      expect(await kinds(build({ screening: unsure }))).not.toContain('BONE_AGE_UPLOAD');
    });
  });

  describe('a bone age well ahead of actual age', () => {
    it('raises a referral when the gap reaches two years', async () => {
      // Ten-year-old, bone age 12y6m.
      const ahead = { predictedAgeMonths: 150, monthsAgo: 0 };
      expect(await kinds(build({ boneAge: ahead }))).toContain('BONE_AGE_REFERRAL');
    });

    it('stays quiet for a gap inside the model’s own error', async () => {
      // Eight months ahead is smaller than the model's mean absolute error of 8.78 months.
      const close = { predictedAgeMonths: 128, monthsAgo: 0 };
      expect(await kinds(build({ boneAge: close }))).not.toContain('BONE_AGE_REFERRAL');
    });

    it('stays quiet when bone age is behind', async () => {
      const behind = { predictedAgeMonths: 96, monthsAgo: 0 };
      expect(await kinds(build({ boneAge: behind }))).not.toContain('BONE_AGE_REFERRAL');
    });
  });

  describe('follow-up reminder', () => {
    it('fires once the follow-up interval has passed', async () => {
      const stale = {
        answers: { breastDevelopment: 'yes', breastDevelopmentAgeYears: 6 },
        monthsAgo: 5,
      };
      expect(await kinds(build({ screening: stale }))).toContain('PUBERTY_FOLLOW_UP');
    });

    it('does not fire before it is due', async () => {
      const fresh = {
        answers: { breastDevelopment: 'yes', breastDevelopmentAgeYears: 6 },
        monthsAgo: 1,
      };
      expect(await kinds(build({ screening: fresh }))).not.toContain('PUBERTY_FOLLOW_UP');
    });
  });

  it('never phrases a suggestion as a diagnosis', async () => {
    const all = await build({
      bmi: { value: 28.4, percentile: 99.1, pctOfP95: 128.5 },
      screening: { answers: { breastDevelopment: 'yes', breastDevelopmentAgeYears: 6 }, monthsAgo: 5 },
      boneAge: { predictedAgeMonths: 150, monthsAgo: 0 },
    }).forChild('u1', 'c1');

    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(s.body).not.toMatch(/\b(diagnos|disorder|abnormal|disease)/i);
    }
  });
});
