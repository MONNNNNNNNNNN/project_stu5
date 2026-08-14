import { ChildSex } from '@prisma/client';
import { buildMonitoringPlan, compilePubertyResult } from './puberty-screening.util';

const FEMALE = 'FEMALE' as ChildSex;
const MALE = 'MALE' as ChildSex;

describe('compilePubertyResult', () => {
  describe('early signs', () => {
    it('flags a sign reported with no onset age, using the child’s current age', () => {
      // The onset-age field is optional. Ticking "breast development" for a 6-year-old is
      // still an early sign even when the parent leaves the age blank.
      expect(compilePubertyResult(FEMALE, 6, { breastDevelopment: true }).outcome).toBe('EARLY_SIGNS');
    });

    it('flags on the reported onset age rather than the age today', () => {
      expect(
        compilePubertyResult(FEMALE, 10, { breastDevelopment: true, breastDevelopmentAgeYears: 7 }).outcome,
      ).toBe('EARLY_SIGNS');
    });

    it('flags boys separately, at the age-9 threshold', () => {
      expect(compilePubertyResult(MALE, 8, { testicularOrGenitalEnlargement: true }).outcome).toBe('EARLY_SIGNS');
      expect(compilePubertyResult(MALE, 11, { testicularOrGenitalEnlargement: true }).outcome).toBe('TYPICAL_ONSET');
    });

    it('flags early pubic hair on its own', () => {
      expect(compilePubertyResult(MALE, 7, { pubicOrBodyHairGrowth: true }).outcome).toBe('EARLY_SIGNS');
    });

    it('always recommends seeing a doctor', () => {
      const result = compilePubertyResult(FEMALE, 6, { breastDevelopment: true });
      expect(result.seeDoctor).toBe(true);
      expect(result.flagged).toBe(true);
      expect(result.guidance[0]).toMatch(/pediatrician/i);
    });
  });

  describe('typical and not-yet-started', () => {
    it('treats onset at a normal age as typical', () => {
      expect(
        compilePubertyResult(FEMALE, 10, { breastDevelopment: true, breastDevelopmentAgeYears: 9 }).outcome,
      ).toBe('TYPICAL_ONSET');
    });

    it('reports no signs as expected for a young child', () => {
      const result = compilePubertyResult(FEMALE, 6, {});
      expect(result.outcome).toBe('NO_SIGNS_YET');
      expect(result.seeDoctor).toBe(false);
    });
  });

  describe('delayed onset', () => {
    it('flags a girl with no breast development by 13', () => {
      expect(compilePubertyResult(FEMALE, 13.5, {}).outcome).toBe('DELAYED_ONSET');
    });

    it('flags a girl with no menarche by 15 even when breast development started on time', () => {
      expect(
        compilePubertyResult(FEMALE, 15.5, { breastDevelopment: true, breastDevelopmentAgeYears: 12 }).outcome,
      ).toBe('DELAYED_ONSET');
    });

    it('flags a boy with no enlargement by 14', () => {
      expect(compilePubertyResult(MALE, 14.5, {}).outcome).toBe('DELAYED_ONSET');
    });
  });
});

describe('buildMonitoringPlan', () => {
  const early = compilePubertyResult(FEMALE, 6, { breastDevelopment: true });
  const typical = compilePubertyResult(FEMALE, 10, {
    breastDevelopment: true,
    breastDevelopmentAgeYears: 9,
  });
  const at = (iso: string) => new Date(iso);

  it('stays inactive until a screening flags early signs', () => {
    expect(buildMonitoringPlan([{ assessedAt: at('2026-01-10'), result: typical }]).active).toBe(false);
  });

  it('schedules the next round four months out', () => {
    const plan = buildMonitoringPlan([{ assessedAt: at('2026-01-10'), result: early }]);
    expect(plan.active).toBe(true);
    expect(plan.completedRounds).toBe(1);
    expect(plan.steps[1].dueAt?.slice(0, 10)).toBe('2026-05-10');
    expect(plan.conclusion).toBeNull();
  });

  it('concludes reassuringly when the follow-ups came back typical', () => {
    // Round 1 is the screening that raised the flag and is EARLY_SIGNS by definition —
    // only rounds 2 and 3 say anything about whether it progressed.
    const plan = buildMonitoringPlan([
      { assessedAt: at('2026-09-10'), result: typical },
      { assessedAt: at('2026-05-10'), result: typical },
      { assessedAt: at('2026-01-10'), result: early },
    ]);
    expect(plan.completedRounds).toBe(3);
    expect(plan.conclusion?.title).toMatch(/typical range/);
  });

  it('keeps pointing at a doctor when early signs persisted through follow-up', () => {
    const plan = buildMonitoringPlan([
      { assessedAt: at('2026-09-10'), result: early },
      { assessedAt: at('2026-05-10'), result: early },
      { assessedAt: at('2026-01-10'), result: early },
    ]);
    expect(plan.conclusion?.title).toMatch(/doctor/);
  });
});
