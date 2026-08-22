import { GrowthReferenceService } from './growth-reference.service';

describe('GrowthReferenceService', () => {
  const service = new GrowthReferenceService();

  describe('curve', () => {
    // The regression this guards: `curve` used to choose a single LMS table from the range's
    // *start* month, so a birth-to-20-years height request got the infant table and stopped
    // at ~36 months. Every chart for a child over three then drew its reference band off the
    // left edge of the child's own data.
    it('spans the whole requested range, not just the infant table', () => {
      const curve = service.curve('height', 'MALE', 0, 240);
      const ages = curve.map((p) => p.ageMonths);

      expect(Math.min(...ages)).toBeLessThan(1);
      expect(Math.max(...ages)).toBeGreaterThan(200);
    });

    it('covers both sides of the WHO/CDC cutover without a gap', () => {
      const ages = service
        .curve('weight', 'FEMALE', 0, 240)
        .map((p) => p.ageMonths);

      expect(ages.some((a) => a < 24)).toBe(true);
      expect(ages.some((a) => a >= 24)).toBe(true);
      expect([...ages].sort((a, b) => a - b)).toEqual(ages);
    });

    it('honours an explicit lower bound (BMI starts at 2 years)', () => {
      const ages = service.curve('bmi', 'MALE', 24, 240).map((p) => p.ageMonths);
      expect(Math.min(...ages)).toBeGreaterThanOrEqual(24);
      // The table itself starts at 24 months; asking for less must not invent rows below it.
      expect(Math.min(...service.curve('bmi', 'MALE', 0, 240).map((p) => p.ageMonths)))
        .toBeGreaterThanOrEqual(24);
    });

    it('orders the bands p3 < p50 < p97 at every sampled age', () => {
      for (const point of service.curve('height', 'FEMALE', 0, 240)) {
        expect(point.p3).toBeLessThan(point.p50);
        expect(point.p50).toBeLessThan(point.p97);
      }
    });

    // The bands were drawn at z = ±2.05 (P2/P98) while the legend, tooltip and caption all
    // called them P3 and P97. Round-tripping through `compute` is what actually pins the
    // curve to the label a parent reads.
    it('puts the p3/p97 bands at the 3rd and 97th percentile', () => {
      const at120 = service
        .curve('height', 'MALE', 0, 240)
        .find((p) => p.ageMonths === 120.5);
      expect(at120).toBeDefined();

      expect(
        service.compute('height', 'MALE', 120.5, at120!.p3)!.percentile,
      ).toBeCloseTo(3, 1);
      expect(
        service.compute('height', 'MALE', 120.5, at120!.p50)!.percentile,
      ).toBeCloseTo(50, 1);
      expect(
        service.compute('height', 'MALE', 120.5, at120!.p97)!.percentile,
      ).toBeCloseTo(97, 1);
    });
  });

  describe('compute', () => {
    it('handles a newborn at ageMonths 0', () => {
      const result = service.compute('weight', 'MALE', 0, 3.3);
      expect(result).not.toBeNull();
      expect(result!.percentile).toBeGreaterThan(0);
      expect(result!.percentile).toBeLessThan(100);
    });

    it('rejects a nonsensical measurement rather than returning a z-score for it', () => {
      expect(service.compute('weight', 'MALE', 12, 0)).toBeNull();
      expect(service.compute('weight', 'MALE', -1, 8)).toBeNull();
    });
  });

  describe('bmi — CDC 2022 extended percentiles', () => {
    /**
     * Copied from CDC's bmi-age-2022.csv, not computed. If these fail, either the extended
     * formula or the sigma column is wrong, and the whole point is that this file does not
     * derive its own expected values.
     */
    const CDC_ROWS = [
      { sex: 'MALE' as const, ageMonths: 120.5, P95: 22.1541, P98: 26.0869, P99: 28.1426, P99_9: 33.0248, P99_99: 36.5943 },
      { sex: 'FEMALE' as const, ageMonths: 120.5, P95: 22.9826, P98: 26.7277, P99: 28.6854, P99_9: 33.3347, P99_99: 36.734 },
      { sex: 'MALE' as const, ageMonths: 24, P95: 19.338, P98: 20.4957, P99: 21.1009, P99_9: 22.5381, P99_99: 23.5889 },
      { sex: 'FEMALE' as const, ageMonths: 240.5, P95: 31.799, P98: 38.3898, P99: 41.8349, P99_9: 50.0167, P99_99: 55.9987 },
    ];

    it.each(CDC_ROWS)(
      'reproduces CDC’s own published percentiles ($sex, $ageMonths mo)',
      ({ sex, ageMonths, P95, P98, P99, P99_9, P99_99 }) => {
        const at = (bmi: number) =>
          service.compute('bmi', sex, ageMonths, bmi)!.percentile;
        expect(at(P95)).toBeCloseTo(95, 2);
        expect(at(P98)).toBeCloseTo(98, 2);
        expect(at(P99)).toBeCloseTo(99, 2);
        expect(at(P99_9)).toBeCloseTo(99.9, 2);
        expect(at(P99_99)).toBeCloseTo(99.99, 2);
      },
    );

    // The regression this whole change exists for. Before it, the LMS z formula could not
    // exceed -1/(L*S) = 3.0096 at this age, so these two landed 0.26 percentile points apart.
    it('separates moderate from severe obesity, which the LMS tail could not', () => {
      const at35 = service.compute('bmi', 'MALE', 120, 35)!;
      const at60 = service.compute('bmi', 'MALE', 120, 60)!;

      expect(at35.percentile).toBeCloseTo(99.97, 2);
      expect(at35.z).toBeCloseTo(3.45, 2);
      expect(at35.pctOfP95).toBeCloseTo(158.3, 1);

      expect(at60.z).toBeCloseTo(8.4, 1);
      expect(at60.pctOfP95).toBeCloseTo(271.4, 1);

      expect(at60.z).toBeGreaterThan(3.01);
      expect(at60.z - at35.z).toBeGreaterThan(4);
    });

    it('joins the LMS body and the extended tail without a step at P95', () => {
      const p95 = service.curve('bmi', 'MALE', 120, 121)[0].p95!;
      for (const factor of [1 - 1e-9, 1, 1 + 1e-9]) {
        const at = service.compute('bmi', 'MALE', 120.5, p95 * factor)!;
        expect(at.percentile).toBeCloseTo(95, 2);
        expect(at.z).toBeCloseTo(1.64, 2);
      }
    });

    it.each([
      ['MALE' as const, 60],
      ['MALE' as const, 120],
      ['FEMALE' as const, 240],
    ])('is monotonic and finite across the join (%s, %i mo)', (sex, ageMonths) => {
      let lastPct = -Infinity;
      let lastZ = -Infinity;
      for (let bmi = 12; bmi <= 60; bmi += 0.25) {
        const at = service.compute('bmi', sex, ageMonths, bmi)!;
        expect(Number.isFinite(at.z)).toBe(true);
        expect(at.percentile).toBeGreaterThanOrEqual(lastPct);
        expect(at.z).toBeGreaterThanOrEqual(lastZ);
        lastPct = at.percentile;
        lastZ = at.z;
      }
    });

    // Under the old A&S erf these saturated and the probit returned Infinity, which Prisma
    // rejects on a Decimal column.
    it('returns a storable number for an implausibly high BMI', () => {
      for (const bmi of [80, 150]) {
        const at = service.compute('bmi', 'MALE', 60, bmi)!;
        expect(Number.isFinite(at.z)).toBe(true);
        expect(at.z).toBeLessThanOrEqual(20);
      }
    });

    it('orders the BMI reference bands', () => {
      for (const point of service.curve('bmi', 'FEMALE', 60, 240)) {
        expect(point.p3).toBeLessThan(point.p50);
        expect(point.p50).toBeLessThan(point.p95!);
        expect(point.p95!).toBeLessThan(point.p120ofP95!);
      }
    });

    it('leaves height and weight untouched', () => {
      // Height and weight never enter the extended branch. These z values were captured by
      // running the pre-change service side by side with this one: identical to the digit,
      // with only the percentile gaining a second decimal place (57 -> 57.05).
      expect(service.compute('height', 'MALE', 120.5, 140)!.z).toBe(0.18);
      expect(service.compute('height', 'FEMALE', 60, 110)!.z).toBe(0.49);
      expect(service.compute('weight', 'FEMALE', 36, 14)!.z).toBe(0.08);
      expect(service.compute('weight', 'MALE', 0, 3.3)!.z).toBe(-0.42);
      expect(service.curve('height', 'MALE', 24, 25)[0]).not.toHaveProperty('p95');
    });
  });
});
