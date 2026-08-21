import { GrowthReferenceService } from './growth-reference.service';
import { hasBmiForAge, nutritionalStatusKey } from './growth.service';

/**
 * The BMI weight-status categories, tested directly.
 *
 * Nothing covered these before — not the cut-points, not the severe tier, not the interaction
 * with the `flagged` guidance. They decide what a parent is told about their child's weight,
 * so they are worth more than the zero tests they had.
 */
describe('nutritionalStatusKey', () => {
  const reference = new GrowthReferenceService();

  describe('CDC cut-points', () => {
    it.each([
      [4.99, 'UNDERWEIGHT'],
      [5, 'HEALTHY'],
      [84.99, 'HEALTHY'],
      [85, 'OVERWEIGHT'],
      [94.99, 'OVERWEIGHT'],
      [95, 'OBESITY'],
    ])('percentile %f is %s', (percentile, expected) => {
      // Well below both severe thresholds, so only the percentile decides.
      expect(nutritionalStatusKey(percentile, 18, 100)).toBe(expected);
    });
  });

  describe('severe obesity', () => {
    it('turns over at exactly 120% of the 95th percentile', () => {
      expect(nutritionalStatusKey(99, 28, 119.9)).toBe('OBESITY');
      expect(nutritionalStatusKey(99, 28, 120)).toBe('SEVERE_OBESITY');
    });

    /**
     * The case that proves the "or a BMI of 35" clause is actually wired up. At twenty years
     * a BMI of 35 is the 97.32nd percentile and only 114% of P95 — under a percentile-only or
     * a percent-only rule this child comes back OVERWEIGHT.
     */
    it('catches a tall older adolescent that the percent-of-P95 rule alone would miss', () => {
      const at240 = reference.compute('bmi', 'FEMALE', 240, 35)!;
      expect(at240.percentile).toBeLessThan(98);
      expect(at240.pctOfP95).toBeLessThan(120);

      expect(
        nutritionalStatusKey(at240.percentile, 35, at240.pctOfP95!),
      ).toBe('SEVERE_OBESITY');
    });

    it('never lets the severe tier escape the obesity tier', () => {
      // The highest P95 anywhere in the table is 31.8, so a BMI of 35 always sits above P95
      // and the two conditions cannot disagree about ordering.
      for (const ageMonths of [24, 60, 120, 180, 240]) {
        for (const sex of ['MALE', 'FEMALE'] as const) {
          const at = reference.compute('bmi', sex, ageMonths, 35)!;
          expect(at.percentile).toBeGreaterThanOrEqual(95);
        }
      }
    });
  });

  describe('the case that used to contradict itself', () => {
    /**
     * A ten-year-old boy at 130cm and 48kg. Height and weight are both inside +/-2 SD, so the
     * old `flagged` rule said "within the typical range for the child's age and sex" while
     * the status line right underneath said severe obesity.
     */
    it('classifies the 130cm / 48kg ten-year-old as severe obesity', () => {
      const bmi = Math.round((48 / 1.3 ** 2) * 100) / 100;
      expect(bmi).toBeCloseTo(28.4, 1);

      const height = reference.compute('height', 'MALE', 120, 130)!;
      const weight = reference.compute('weight', 'MALE', 120, 48)!;
      const at = reference.compute('bmi', 'MALE', 120, bmi)!;

      // Neither of the thresholds that used to drive `flagged` fires here.
      expect(Math.abs(height.z)).toBeLessThan(2);
      expect(Math.abs(weight.z)).toBeLessThan(2);

      expect(at.pctOfP95).toBeGreaterThan(120);
      expect(nutritionalStatusKey(at.percentile, bmi, at.pctOfP95!)).toBe(
        'SEVERE_OBESITY',
      );
    });
  });
});

describe('hasBmiForAge', () => {
  it('starts at five years', () => {
    expect(hasBmiForAge(59)).toBe(false);
    expect(hasBmiForAge(60)).toBe(true);
  });

  // ageInMonths divides by an average month length, so an exact fifth birthday can compute as
  // a hair under 60 depending on where the leap years fell.
  it('rounds, so a fifth birthday is not lost to leap-year drift', () => {
    expect(hasBmiForAge(59.99)).toBe(true);
    expect(hasBmiForAge(59.4)).toBe(false);
  });
});
