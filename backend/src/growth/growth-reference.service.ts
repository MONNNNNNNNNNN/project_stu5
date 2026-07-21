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

type Measure = 'weight' | 'height' | 'bmi';
type Sex = 'MALE' | 'FEMALE';

const INFANT_CUTOVER_MONTHS = 24;

function sexCode(sex: Sex): 1 | 2 {
  return sex === 'MALE' ? 1 : 2;
}

function pickTable(measure: Measure, ageMonths: number): LmsRow[] {
  if (measure === 'bmi') return bmiChild as LmsRow[];
  const infant = measure === 'weight' ? (weightInfant as LmsRow[]) : (heightInfant as LmsRow[]);
  const child = measure === 'weight' ? (weightChild as LmsRow[]) : (heightChild as LmsRow[]);
  return ageMonths < INFANT_CUTOVER_MONTHS ? infant : child;
}

function interpolateLms(table: LmsRow[], sex: Sex, ageMonths: number): LmsRow | null {
  const rows = table.filter((r) => r.sex === sexCode(sex));
  if (rows.length === 0) return null;

  const clamped = Math.min(Math.max(ageMonths, rows[0].ageMonths), rows[rows.length - 1].ageMonths);

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
  return {
    sex: lo.sex,
    ageMonths: clamped,
    L: lo.L + t * (hi.L - lo.L),
    M: lo.M + t * (hi.M - lo.M),
    S: lo.S + t * (hi.S - lo.S),
  };
}

function zScore(x: number, lms: LmsRow): number {
  if (lms.L === 0) return Math.log(x / lms.M) / lms.S;
  return (Math.pow(x / lms.M, lms.L) - 1) / (lms.L * lms.S);
}

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
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface GrowthMetric {
  z: number;
  percentile: number;
}

@Injectable()
export class GrowthReferenceService {
  /** Age in whole months (fractional) between two dates. */
  ageInMonths(dateOfBirth: Date, on: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (on.getTime() - dateOfBirth.getTime()) / msPerDay;
    return days / 30.4375;
  }

  compute(measure: Measure, sex: Sex, ageMonths: number, value: number): GrowthMetric | null {
    if (ageMonths < 0 || value <= 0) return null;
    const table = pickTable(measure, ageMonths);
    const lms = interpolateLms(table, sex, ageMonths);
    if (!lms) return null;
    const z = zScore(value, lms);
    return { z: Math.round(z * 100) / 100, percentile: Math.round(normalCdf(z) * 1000) / 10 };
  }

  /** Reference percentile curves (P3/P50/P97) for charting, sampled monthly across the given age range. */
  curve(measure: Measure, sex: Sex, fromMonths: number, toMonths: number) {
    const table = pickTable(measure, fromMonths);
    const rows = table.filter((r) => r.sex === sexCode(sex) && r.ageMonths >= fromMonths && r.ageMonths <= toMonths);
    return rows.map((r) => ({
      ageMonths: r.ageMonths,
      p3: r.L === 0 ? r.M * Math.exp(-2.05 * r.S) : r.M * Math.pow(1 - 2.05 * r.L * r.S, 1 / r.L),
      p50: r.M,
      p97: r.L === 0 ? r.M * Math.exp(2.05 * r.S) : r.M * Math.pow(1 + 2.05 * r.L * r.S, 1 / r.L),
    }));
  }
}
