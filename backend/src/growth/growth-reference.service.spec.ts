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

    it('honours an explicit lower bound (BMI starts at 5 years)', () => {
      const ages = service
        .curve('bmi', 'MALE', 60, 240)
        .map((p) => p.ageMonths);
      expect(Math.min(...ages)).toBeGreaterThanOrEqual(60);
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
});
