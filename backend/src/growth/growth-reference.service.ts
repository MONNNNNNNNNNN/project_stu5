import { Injectable } from '@nestjs/common';
import weightInfant from './reference-data/weight-infant.json';
import heightInfant from './reference-data/height-infant.json';
import weightChild from './reference-data/weight-child.json';
import heightChild from './reference-data/height-child.json';
import bmiChild from './reference-data/bmi-child.json';

interface LmsRow {
  sex: 1 | 2;
  ageMonths: number;
  L: number;
  M: number;
  S: number;
}

/**
 * BMI rows carry one parameter the others do not.
 *
 * CDC's December 2022 extended BMI-for-age keeps the same L/M/S below the 95th percentile and
 * splices a half-normal onto the tail above it. `sigma` is that distribution's scale. It
 * exists only in the BMI table, which is why it is a separate interface rather than an
 * optional field on `LmsRow` that height and weight would have to keep explaining.
 *
 * Source: https://www.cdc.gov/growthcharts/data/extended-bmi/bmi-age-2022.csv
 */
interface BmiLmsRow extends LmsRow {
  sigma: number;
}

type Measure = 'weight' | 'height' | 'bmi';
type Sex = 'MALE' | 'FEMALE';

/**
 * Where the infant table hands over to the child table. Also where CDC switches from
 * recumbent length to standing stature.
 *
 * All five LMS tables are CDC 2000 (United States) — see reference-data/README.md, which
 * also records the two open questions: TOR §2A.2 requires the reference dataset to be
 * confirmed with the Client Representative, and a US reference applied to Thai children is
 * a decision worth making deliberately rather than by default.
 */
const INFANT_CUTOVER_MONTHS = 24;

function sexCode(sex: Sex): 1 | 2 {
  return sex === 'MALE' ? 1 : 2;
}

function pickTable(measure: Measure, ageMonths: number): LmsRow[] {
  if (measure === 'bmi') return bmiChild as LmsRow[];
  const infant =
    measure === 'weight'
      ? (weightInfant as LmsRow[])
      : (heightInfant as LmsRow[]);
  const child =
    measure === 'weight'
      ? (weightChild as LmsRow[])
      : (heightChild as LmsRow[]);
  return ageMonths < INFANT_CUTOVER_MONTHS ? infant : child;
}

/**
 * Every row covering an age range, rather than the one table a single age falls in.
 *
 * Height and weight are a hybrid reference — WHO below `INFANT_CUTOVER_MONTHS`, CDC at or
 * above it — and the two tables overlap (infant runs to ~36 months, child starts at 24).
 * `pickTable` resolves that overlap for a point lookup by taking one age; a *range* needs
 * both tables. Selecting by the range's start month instead silently capped a
 * birth-to-20-years curve at the infant table's last row, so every chart for a child over
 * about three drew its reference band off the left edge of the child's actual data.
 *
 * The split is the same one `pickTable` applies, so a plotted band always agrees with the
 * percentile computed for a point sitting on it.
 */
function tableRange(
  measure: Measure,
  fromMonths: number,
  toMonths: number,
): LmsRow[] {
  if (measure === 'bmi') return bmiChild as LmsRow[];
  const infant =
    measure === 'weight'
      ? (weightInfant as LmsRow[])
      : (heightInfant as LmsRow[]);
  const child =
    measure === 'weight'
      ? (weightChild as LmsRow[])
      : (heightChild as LmsRow[]);

  const rows: LmsRow[] = [];
  if (fromMonths < INFANT_CUTOVER_MONTHS) {
    rows.push(...infant.filter((r) => r.ageMonths < INFANT_CUTOVER_MONTHS));
  }
  if (toMonths >= INFANT_CUTOVER_MONTHS) {
    rows.push(...child.filter((r) => r.ageMonths >= INFANT_CUTOVER_MONTHS));
  }
  return rows;
}

function interpolateLms(
  table: LmsRow[],
  sex: Sex,
  ageMonths: number,
): (LmsRow & { sigma?: number }) | null {
  const rows = table.filter((r) => r.sex === sexCode(sex));
  if (rows.length === 0) return null;

  const clamped = Math.min(
    Math.max(ageMonths, rows[0].ageMonths),
    rows[rows.length - 1].ageMonths,
  );

  let lo = rows[0];
  let hi = rows[rows.length - 1];
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].ageMonths <= clamped && clamped <= rows[i + 1].ageMonths) {
      lo = rows[i];
      hi = rows[i + 1];
      break;
    }
  }

  if (lo.ageMonths === hi.ageMonths) return lo;
  const t = (clamped - lo.ageMonths) / (hi.ageMonths - lo.ageMonths);
  const loSigma = (lo as BmiLmsRow).sigma;
  const hiSigma = (hi as BmiLmsRow).sigma;
  return {
    sex: lo.sex,
    ageMonths: clamped,
    L: lo.L + t * (hi.L - lo.L),
    M: lo.M + t * (hi.M - lo.M),
    S: lo.S + t * (hi.S - lo.S),
    // BMI only. Interpolated exactly like L/M/S and on the same half-month grid; sigma is
    // strictly increasing with age (1.376 -> 7.831) with no adjacent-row step above 3%, so
    // linear interpolation cannot land on a nonsensical value.
    ...(loSigma !== undefined && hiSigma !== undefined
      ? { sigma: loSigma + t * (hiSigma - loSigma) }
      : {}),
  };
}

function zScore(x: number, lms: LmsRow): number {
  if (lms.L === 0) return Math.log(x / lms.M) / lms.S;
  return (Math.pow(x / lms.M, lms.L) - 1) / (lms.L * lms.S);
}

/** Inverse of `zScore` — the measurement a given z-score corresponds to for one LMS row. */
function valueAtZ(lms: LmsRow, z: number): number {
  if (lms.L === 0) return lms.M * Math.exp(z * lms.S);
  return lms.M * Math.pow(1 + lms.L * lms.S * z, 1 / lms.L);
}

/**
 * z bounding the 3rd and 97th percentiles: Phi(1.88079) = 0.97. This used to be 2.05, which
 * is P2/P98 — close enough to look right on a chart, but the legend, the tooltip and the
 * caption under every chart all name these curves P3 and P97 to the parent reading them.
 */
const P3_P97_Z = 1.88079;

/** Abramowitz & Stegun 7.1.26 approximation, |error| < 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * z at the 95th percentile: Phi(1.6448536269514722) = 0.95.
 *
 * Both the branch point for CDC's extended BMI percentiles and the reason the two branches
 * meet without a step: P95 is *defined* as `valueAtZ(lms, P95_Z)`, so at exactly that BMI the
 * extended formula's offset is zero and it returns the same 95 the LMS branch does.
 */
const P95_Z = 1.6448536269514722;

/** The other two CDC BMI category boundaries: Phi(-1.6449) = 0.05, Phi(1.0364) = 0.85. */
const P5_Z = -1.6448536269514722;
const P85_Z = 1.0364333894937898;

/**
 * Complementary error function — Chebyshev fit, Numerical Recipes 3rd ed. §6.2.
 *
 * `erf` above (A&S 7.1.26) is accurate to 1.5e-7 *absolute*, which is fine for a percentile
 * and useless for a tail probability: the true upper tail at z = 5 is 2.9e-7, so A&S carries
 * roughly 50% *relative* error there and saturates outright above z ~ 6 — which would make
 * the probit below return Infinity and Prisma reject the write. A BMI of 40 in a ten-year-old
 * already reaches z 4.37. This fit holds ~1e-13 fractional accuracy across the whole tail.
 *
 * `erf`/`normalCdf` are deliberately left alone so height and weight results are unchanged.
 */
const ERFC_COF = [
  -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
  -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
  4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6, 1.30365583558e-6,
  1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9,
  -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12,
  8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15,
];

function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  let d = 0;
  let dd = 0;
  for (let j = ERFC_COF.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + ERFC_COF[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (ERFC_COF[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

/**
 * Upper-tail probability P(Z > x).
 *
 * Computed directly rather than as `1 - normalCdf(x)`, which cancels to exactly zero once x
 * passes about 8 and throws away every significant digit long before that.
 */
function normalSf(x: number): number {
  return 0.5 * erfc(x / Math.SQRT2);
}

/**
 * Inverse normal CDF, expressed on the upper tail: returns z such that P(Z > z) = q.
 *
 * Peter Acklam's rational approximation, relative error below 1.15e-9 — far more than the two
 * decimal places `compute` rounds to, and chosen over Wichura's AS241 because it is half the
 * coefficients for accuracy this codebase does not need.
 *
 * Taking q as the upper tail rather than accepting a percentile is the point: converting a
 * 99.99th percentile back to an SDS via `probit(p / 100)` loses all precision, and
 * `probit(100 / 100)` is Infinity.
 */
const PROBIT_A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
  1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
];
const PROBIT_B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
  6.680131188771972e1, -1.328068155288572e1,
];
const PROBIT_C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
  -2.549732539343734, 4.374664141464968, 2.938163982698783,
];
const PROBIT_D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
  3.754408661907416,
];
const PROBIT_LOW = 0.02425;

function probitUpper(q: number): number {
  if (!(q > 0)) return Infinity;
  if (q >= 1) return -Infinity;
  if (q < PROBIT_LOW) {
    const t = Math.sqrt(-2 * Math.log(q));
    return (
      -(
        ((((PROBIT_C[0] * t + PROBIT_C[1]) * t + PROBIT_C[2]) * t + PROBIT_C[3]) *
          t +
          PROBIT_C[4]) *
          t +
        PROBIT_C[5]
      ) /
      ((((PROBIT_D[0] * t + PROBIT_D[1]) * t + PROBIT_D[2]) * t + PROBIT_D[3]) *
        t +
        1)
    );
  }
  if (q > 1 - PROBIT_LOW) return -probitUpper(1 - q);
  const r = 0.5 - q;
  const s = r * r;
  return (
    ((((((PROBIT_A[0] * s + PROBIT_A[1]) * s + PROBIT_A[2]) * s + PROBIT_A[3]) *
      s +
      PROBIT_A[4]) *
      s +
      PROBIT_A[5]) *
      r) /
    (((((PROBIT_B[0] * s + PROBIT_B[1]) * s + PROBIT_B[2]) * s + PROBIT_B[3]) *
      s +
      PROBIT_B[4]) *
      s +
      1)
  );
}

/**
 * CDC 2022 extended BMI-for-age, above the 95th percentile.
 *
 * The LMS z formula has a hard ceiling wherever L is negative, which for BMI it is at every
 * age: z can never exceed -1/(L*S), and for a ten-year-old boy that is 3.0096. So BMI 35 and
 * BMI 60 came out 0.26 percentile points apart (99.5704 and 99.8272) despite one being nearly
 * double the other. CDC replaces the tail with a half-normal on the BMI scale itself:
 *
 *     P(bmi) = 100 * (0.95 + 0.05 * (2*Phi((bmi - P95)/sigma) - 1))     for bmi >= P95
 *
 * Verified against CDC's own published P95/P98/P99/P99.9/P99.99 columns across all 438 rows,
 * worst disagreement 1.2e-4 percentile points — see scripts/build-reference-data.mjs.
 *
 * The upper tail is carried as `q` throughout rather than reconstructed from the percentile,
 * because `1 - P/100` cancels to zero well before the model stops being able to resolve.
 */
function extendedBmiTail(
  bmi: number,
  p95: number,
  sigma: number,
): { percentile: number; z: number } {
  const q = 0.1 * normalSf((bmi - p95) / sigma);
  return { percentile: 100 * (1 - q), z: probitUpper(q) };
}

/**
 * Storage guard, not a clinical one. `bmiSds` is Decimal(4,2), and the tail probability only
 * underflows to zero above z ~ 37; the largest a real measurement produces is around 8.4
 * (BMI 60 at ten years).
 */
const MAX_STORABLE_Z = 20;

export interface GrowthMetric {
  z: number;
  percentile: number;
  /**
   * BMI only: the measurement as a percentage of the 95th percentile for age and sex.
   *
   * CDC's severity metric above P95, and the only one that still resolves once the percentile
   * has saturated — BMI 35 and BMI 60 in a ten-year-old are 99.97 and 100.00, but 158% and
   * 271% of P95.
   */
  pctOfP95?: number;
}

@Injectable()
export class GrowthReferenceService {
  /** Age in whole months (fractional) between two dates. */
  ageInMonths(dateOfBirth: Date, on: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (on.getTime() - dateOfBirth.getTime()) / msPerDay;
    return days / 30.4375;
  }

  compute(
    measure: Measure,
    sex: Sex,
    ageMonths: number,
    value: number,
  ): GrowthMetric | null {
    if (ageMonths < 0 || value <= 0) return null;
    const table = pickTable(measure, ageMonths);
    const lms = interpolateLms(table, sex, ageMonths);
    if (!lms) return null;

    // Two decimal places, not one. The extended range lives entirely inside the last of them:
    // at one decimal place a BMI of 35, 40 and 60 all store as 100.0 and the whole extension
    // is cosmetic. bmiPercentile is already Decimal(5,2), so this needs no schema change.
    if (measure === 'bmi' && lms.sigma !== undefined) {
      const p95 = valueAtZ(lms, P95_Z);
      const pctOfP95 = Math.round((value / p95) * 1000) / 10;

      if (value >= p95) {
        const { percentile, z } = extendedBmiTail(value, p95, lms.sigma);
        return {
          z: Math.round(Math.min(z, MAX_STORABLE_Z) * 100) / 100,
          percentile: Math.round(percentile * 100) / 100,
          pctOfP95,
        };
      }

      const z = zScore(value, lms);
      return {
        z: Math.round(z * 100) / 100,
        percentile: Math.round(normalCdf(z) * 10000) / 100,
        pctOfP95,
      };
    }

    const z = zScore(value, lms);
    return {
      z: Math.round(z * 100) / 100,
      percentile: Math.round(normalCdf(z) * 10000) / 100,
    };
  }

  /** Reference percentile curves (P3/P50/P97) for charting, sampled monthly across the given age range. */
  curve(measure: Measure, sex: Sex, fromMonths: number, toMonths: number) {
    const rows = tableRange(measure, fromMonths, toMonths).filter(
      (r) =>
        r.sex === sexCode(sex) &&
        r.ageMonths >= fromMonths &&
        r.ageMonths <= toMonths,
    );
    return rows.map((r) => {
      // BMI charts get P95 and 120%-of-P95 instead of P97. P95 is the obesity line and 120%
      // of it is CDC's severe-obesity line; P97 has no clinical reading on a BMI chart and
      // sits about 1.2 BMI units from P95 at ten years, so drawing both just puts two nearly
      // coincident dashed lines on the same axis.
      const sigma = (r as BmiLmsRow).sigma;
      const isBmi = sigma !== undefined;
      return {
        ageMonths: r.ageMonths,
        p3: valueAtZ(r, -P3_P97_Z),
        p50: r.M,
        p97: valueAtZ(r, P3_P97_Z),
        // BMI also carries the boundaries of CDC's weight-status categories, so the chart can
        // shade them. These are the same cut-points nutritionalStatusKey classifies on, read
        // from the same LMS row, so a shaded band and the label under it cannot disagree.
        ...(isBmi
          ? {
              p5: valueAtZ(r, P5_Z),
              p85: valueAtZ(r, P85_Z),
              p95: valueAtZ(r, P95_Z),
              p120ofP95: 1.2 * valueAtZ(r, P95_Z),
            }
          : {}),
      };
    });
  }
}
