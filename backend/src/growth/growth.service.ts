import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import {
  GrowthReferenceService,
  HEAD_CIRCUMFERENCE_MAX_MONTHS,
} from './growth-reference.service';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { UpdateGrowthRecordDto } from './dto/update-growth-record.dto';

/**
 * BMI-for-age starts at two years, not five.
 *
 * FR-8 says five, and the app honoured that — but CDC's own BMI-for-age table begins at
 * 24 months, so three years of valid reference data per sex were being discarded, and a parent
 * logging a three-year-old got percentiles with no weight status at all.
 *
 * Two years is what the Bright Futures / AAP periodicity schedule specifies: BMI is measured at
 * every well-child visit from 24 months through 21 years. Below that it is weight-for-length,
 * not BMI. Source: Bright Futures/AAP Recommendations for Preventive Pediatric Health Care,
 * 4th ed. Checked 2026-08-23.
 */
const BMI_FOR_AGE_MIN_MONTHS = 24;
const NOTABLE_Z_THRESHOLD = 2; // roughly outside the ~2.3rd-97.7th percentile band.

function computeBmi(
  heightCm?: number | null,
  weightKg?: number | null,
): number | null {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

/**
 * CDC BMI-for-age weight status categories.
 *
 *   underweight      below the 5th percentile
 *   healthy weight   5th to below the 85th
 *   overweight       85th to below the 95th
 *   obesity          95th and above
 *   severe obesity   at or above 120% of the 95th percentile, or a BMI of 35, whichever
 *                    comes first
 *
 * Source: CDC, "Defining Child BMI Categories", alongside the 2022 extended BMI-for-age
 * percentiles. Checked 2026-08-21. Closes the BMI cut-points row of research-checklist.md D2.
 *
 * Severity above the 95th is deliberately driven by percent-of-P95 rather than by a
 * percentile. 120% of P95 corresponds to the 99.98th percentile at two years and the 98.05th
 * at twenty — a fixed percentile cut-point would be wrong by nearly two percentile points
 * across the age range this app covers, and at that end of the scale that is the difference
 * between one child in fifty and one in four thousand.
 *
 * The BMI-of-35 clause is load-bearing, not decorative: at twenty years a BMI of 35 is the
 * 97.32nd percentile, which sits *below* 120% of P95, and tall older adolescents are exactly
 * who it catches. The two conditions cannot invert the ordering — the highest P95 anywhere in
 * the table is 31.8, so a BMI of 35 always implies a BMI above P95.
 */
const SEVERE_OBESITY_PCT_OF_P95 = 120;
const SEVERE_OBESITY_BMI = 35;

export type NutritionalStatusKey =
  | 'UNDERWEIGHT'
  | 'HEALTHY'
  | 'OVERWEIGHT'
  | 'OBESITY'
  | 'SEVERE_OBESITY';

const NUTRITIONAL_STATUS_LABELS: Record<NutritionalStatusKey, string> = {
  UNDERWEIGHT: 'Underweight',
  HEALTHY: 'Healthy weight',
  OVERWEIGHT: 'Overweight',
  OBESITY: 'Obesity',
  SEVERE_OBESITY: 'Severe obesity',
};

export function nutritionalStatusKey(
  bmiPercentile: number,
  bmi: number | null,
  pctOfP95: number | null,
): NutritionalStatusKey {
  if (bmiPercentile < 5) return 'UNDERWEIGHT';
  if (bmiPercentile < 85) return 'HEALTHY';
  if (bmiPercentile < 95) return 'OVERWEIGHT';
  const severe =
    (pctOfP95 !== null && pctOfP95 >= SEVERE_OBESITY_PCT_OF_P95) ||
    (bmi !== null && bmi >= SEVERE_OBESITY_BMI);
  return severe ? 'SEVERE_OBESITY' : 'OBESITY';
}

/**
 * BMI-for-age only applies from five years (FR-8).
 *
 * Rounded before comparing because `ageInMonths` divides by an average month length, which
 * can land a hair under an exact-year boundary purely from leap-year timing — 59.99 rather
 * than 60. Shared so the backfill script and `computeMetrics` cannot drift apart on it.
 */
export function hasBmiForAge(ageMonths: number): boolean {
  return Math.round(ageMonths) >= BMI_FOR_AGE_MIN_MONTHS;
}

@Injectable()
export class GrowthService {
  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
    private reference: GrowthReferenceService,
  ) {}

  /** FR-7/FR-8: percentile + SDS for height/weight-for-age, and BMI-for-age for children 5y+. */
  private async computeMetrics(
    childId: string,
    measuredAt: Date,
    heightCm?: number | null,
    weightKg?: number | null,
    headCircumferenceCm?: number | null,
  ) {
    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
    });
    const ageMonths = this.reference.ageInMonths(child.dateOfBirth, measuredAt);
    const bmi = computeBmi(heightCm, weightKg);

    const height = heightCm
      ? this.reference.compute('height', child.sex, ageMonths, heightCm)
      : null;
    const weight = weightKg
      ? this.reference.compute('weight', child.sex, ageMonths, weightKg)
      : null;
    const bmiMetric =
      bmi && hasBmiForAge(ageMonths)
        ? this.reference.compute('bmi', child.sex, ageMonths, bmi)
        : null;

    // Only meaningful while the skull is still growing fast enough for the percentile to say
    // anything; CDC's table stops at 36 months and so does this.
    const headCircumference =
      headCircumferenceCm && ageMonths <= HEAD_CIRCUMFERENCE_MAX_MONTHS
        ? this.reference.compute(
            'headCircumference',
            child.sex,
            ageMonths,
            headCircumferenceCm,
          )
        : null;

    return {
      bmi,
      headCircumferenceCm: headCircumferenceCm ?? null,
      headCircumferencePercentile: headCircumference?.percentile ?? null,
      headCircumferenceSds: headCircumference?.z ?? null,
      heightPercentile: height?.percentile ?? null,
      heightSds: height?.z ?? null,
      weightPercentile: weight?.percentile ?? null,
      weightSds: weight?.z ?? null,
      bmiPercentile: bmiMetric?.percentile ?? null,
      bmiSds: bmiMetric?.z ?? null,
      bmiPctOfP95: bmiMetric?.pctOfP95 ?? null,
    };
  }

  /** FR-10 + FR-8: plain-language guidance, non-diagnostic. */
  private guidance(record: {
    heightSds: unknown;
    weightSds: unknown;
    bmi: unknown;
    bmiPercentile: unknown;
    bmiPctOfP95?: unknown;
  }): {
    message: string;
    flagged: boolean;
    nutritionalStatus: string | null;
    nutritionalStatusKey: NutritionalStatusKey | null;
    bmiPctOfP95: number | null;
  } {
    const asNumber = (v: unknown) => (v !== null && v !== undefined ? Number(v) : null);
    const heightSds = asNumber(record.heightSds);
    const weightSds = asNumber(record.weightSds);
    const bmi = asNumber(record.bmi);
    const bmiPercentile = asNumber(record.bmiPercentile);
    const bmiPctOfP95 = asNumber(record.bmiPctOfP95);

    const statusKey =
      bmiPercentile !== null
        ? nutritionalStatusKey(bmiPercentile, bmi, bmiPctOfP95)
        : null;

    // BMI has to count towards the flag. Without it the app printed "within the typical range
    // for the child's age and sex" directly above "Nutritional status: Severe obesity" — a
    // ten-year-old at 130cm and 48kg is 128.5% of P95 but only -1.33 and 1.80 SD on height
    // and weight, so neither of those thresholds fired.
    const flagged =
      (heightSds !== null && Math.abs(heightSds) > NOTABLE_Z_THRESHOLD) ||
      (weightSds !== null && Math.abs(weightSds) > NOTABLE_Z_THRESHOLD) ||
      statusKey === 'UNDERWEIGHT' ||
      statusKey === 'OBESITY' ||
      statusKey === 'SEVERE_OBESITY';

    const message = flagged
      ? "This measurement falls notably outside the typical range for the child's age and sex. This is a screening signal, not a diagnosis — consider discussing it with a pediatrician."
      : "This measurement is within the typical range for the child's age and sex.";

    return {
      message,
      flagged,
      nutritionalStatus: statusKey ? NUTRITIONAL_STATUS_LABELS[statusKey] : null,
      // The key, not just the label, so the UI can colour and branch on a stable value rather
      // than matching on prose that copy edits will change.
      nutritionalStatusKey: statusKey,
      bmiPctOfP95,
    };
  }

  private attachGuidance<
    T extends {
      heightSds: unknown;
      weightSds: unknown;
      bmi: unknown;
      bmiPercentile: unknown;
      bmiPctOfP95?: unknown;
    },
  >(record: T) {
    return { ...record, guidance: this.guidance(record) };
  }

  async create(userId: string, dto: CreateGrowthRecordDto) {
    await this.childrenService.assertGuardianAccess(dto.childId, userId);
    // FR-6 asks for height and weight; both are optional on the DTO so a parent can log
    // just one. Neither, though, stores a dated row with nothing in it — it shows up as a
    // blank line in the history and a gap in every chart.
    if (
      dto.heightCm === undefined &&
      dto.weightKg === undefined &&
      dto.headCircumferenceCm === undefined
    ) {
      throw new BadRequestException(
        'Record at least one of height, weight or head circumference',
      );
    }
    const measuredAt = dto.measuredAt ? new Date(dto.measuredAt) : new Date();
    const metrics = await this.computeMetrics(
      dto.childId,
      measuredAt,
      dto.heightCm,
      dto.weightKg,
      dto.headCircumferenceCm,
    );

    const record = await this.prisma.growthRecord.create({
      data: {
        childId: dto.childId,
        measuredAt,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        note: dto.note,
        ...metrics,
      },
    });
    return this.attachGuidance(record);
  }

  async findAll(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const records = await this.prisma.growthRecord.findMany({
      where: { childId, deletedAt: null },
      orderBy: { measuredAt: 'desc' },
    });
    return records.map((r) => this.attachGuidance(r));
  }

  async findOne(userId: string, id: string) {
    const record = await this.prisma.growthRecord.findUnique({ where: { id } });
    if (!record || record.deletedAt) {
      throw new NotFoundException('Growth record not found');
    }
    await this.childrenService.assertGuardianAccess(record.childId, userId);
    return record;
  }

  async update(userId: string, id: string, dto: UpdateGrowthRecordDto) {
    const record = await this.findOne(userId, id);
    const heightCm =
      dto.heightCm ?? (record.heightCm ? Number(record.heightCm) : undefined);
    const weightKg =
      dto.weightKg ?? (record.weightKg ? Number(record.weightKg) : undefined);
    const measuredAt = dto.measuredAt
      ? new Date(dto.measuredAt)
      : record.measuredAt;
    const headCircumferenceCm =
      dto.headCircumferenceCm ??
      (record.headCircumferenceCm ? Number(record.headCircumferenceCm) : undefined);
    const metrics = await this.computeMetrics(
      record.childId,
      measuredAt,
      heightCm,
      weightKg,
      headCircumferenceCm,
    );

    const updated = await this.prisma.growthRecord.update({
      where: { id },
      data: {
        heightCm,
        weightKg,
        note: dto.note ?? record.note,
        measuredAt,
        ...metrics,
      },
    });
    return this.attachGuidance(updated);
  }

  async remove(userId: string, id: string) {
    const record = await this.findOne(userId, id);
    await this.prisma.growthRecord.update({
      where: { id: record.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async chart(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const records = await this.prisma.growthRecord.findMany({
      where: { childId, deletedAt: null },
      orderBy: { measuredAt: 'asc' },
      select: {
        measuredAt: true,
        heightCm: true,
        weightKg: true,
        bmi: true,
        heightPercentile: true,
        weightPercentile: true,
        bmiPercentile: true,
        bmiPctOfP95: true,
        headCircumferenceCm: true,
        headCircumferencePercentile: true,
      },
    });
    return records.map((r) => ({
      date: r.measuredAt,
      heightCm: r.heightCm ? Number(r.heightCm) : null,
      weightKg: r.weightKg ? Number(r.weightKg) : null,
      bmi: r.bmi ? Number(r.bmi) : null,
      heightPercentile: r.heightPercentile ? Number(r.heightPercentile) : null,
      weightPercentile: r.weightPercentile ? Number(r.weightPercentile) : null,
      bmiPercentile: r.bmiPercentile ? Number(r.bmiPercentile) : null,
      bmiPctOfP95: r.bmiPctOfP95 ? Number(r.bmiPctOfP95) : null,
      headCircumferenceCm: r.headCircumferenceCm ? Number(r.headCircumferenceCm) : null,
      headCircumferencePercentile: r.headCircumferencePercentile
        ? Number(r.headCircumferencePercentile)
        : null,
    }));
  }

  /** FR-9: reference percentile curves (P3/P50/P97) for the child's sex, to plot alongside chart(). */
  async referenceCurve(
    userId: string,
    childId: string,
    measure: 'height' | 'weight' | 'bmi',
  ) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
    });
    const maxMonths = measure === 'bmi' ? 240 : 240;
    const minMonths = measure === 'bmi' ? BMI_FOR_AGE_MIN_MONTHS : 0;
    return this.reference.curve(measure, child.sex, minMonths, maxMonths);
  }

  async history(userId: string, childId: string) {
    return this.findAll(userId, childId);
  }

  async statistics(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const [latest, previous] = await this.prisma.growthRecord.findMany({
      where: { childId, deletedAt: null },
      orderBy: { measuredAt: 'desc' },
      take: 2,
    });

    if (!latest) {
      return {
        latest: null,
        heightDeltaCm: null,
        weightDeltaKg: null,
        since: null,
      };
    }

    const heightDeltaCm =
      previous && latest.heightCm && previous.heightCm
        ? Number(latest.heightCm) - Number(previous.heightCm)
        : null;
    const weightDeltaKg =
      previous && latest.weightKg && previous.weightKg
        ? Number(latest.weightKg) - Number(previous.weightKg)
        : null;

    return {
      latest: this.attachGuidance(latest),
      heightDeltaCm,
      weightDeltaKg,
      since: previous?.measuredAt ?? null,
    };
  }

  bmi(heightCm: number, weightKg: number) {
    if (!heightCm || !weightKg) {
      throw new BadRequestException(
        'heightCm and weightKg query params are required',
      );
    }
    return { bmi: computeBmi(heightCm, weightKg) };
  }

  /** Ad-hoc calculator (no saved record required): sex, ageMonths, and the measured value. */
  percentile(
    sex: 'MALE' | 'FEMALE',
    ageMonths: number,
    measure: 'height' | 'weight' | 'bmi',
    value: number,
  ) {
    // Number.isFinite rather than truthiness: ageMonths is 0 for a newborn, so `!ageMonths`
    // rejected exactly the youngest children this calculator exists to cover — and did it
    // with a "params are required" message for a param that had been supplied.
    if (
      !sex ||
      !measure ||
      !Number.isFinite(ageMonths) ||
      !Number.isFinite(value)
    ) {
      throw new BadRequestException(
        'sex, ageMonths, measure, and value query params are required',
      );
    }
    const result = this.reference.compute(measure, sex, ageMonths, value);
    if (!result)
      throw new BadRequestException(
        'Unable to compute percentile for the given inputs',
      );
    return result;
  }

  sds(
    sex: 'MALE' | 'FEMALE',
    ageMonths: number,
    measure: 'height' | 'weight' | 'bmi',
    value: number,
  ) {
    return this.percentile(sex, ageMonths, measure, value);
  }
}
