import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { GrowthReferenceService } from './growth-reference.service';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { UpdateGrowthRecordDto } from './dto/update-growth-record.dto';

const BMI_FOR_AGE_MIN_MONTHS = 60; // FR-8: BMI-for-age applies to children aged 5 years and above.
const NOTABLE_Z_THRESHOLD = 2; // roughly outside the ~2.3rd-97.7th percentile band.

function computeBmi(
  heightCm?: number | null,
  weightKg?: number | null,
): number | null {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

function nutritionalStatus(bmiPercentile: number): string {
  if (bmiPercentile < 5) return 'Underweight';
  if (bmiPercentile < 85) return 'Healthy weight';
  if (bmiPercentile < 95) return 'Overweight';
  return 'Obesity range';
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
    // Round before comparing: ageInMonths uses an average days-per-month divisor, which can land
    // a hair under an exact-year threshold (e.g. 59.99 instead of 60) purely from leap-year timing.
    const bmiMetric =
      bmi && Math.round(ageMonths) >= BMI_FOR_AGE_MIN_MONTHS
        ? this.reference.compute('bmi', child.sex, ageMonths, bmi)
        : null;

    return {
      bmi,
      heightPercentile: height?.percentile ?? null,
      heightSds: height?.z ?? null,
      weightPercentile: weight?.percentile ?? null,
      weightSds: weight?.z ?? null,
      bmiPercentile: bmiMetric?.percentile ?? null,
      bmiSds: bmiMetric?.z ?? null,
    };
  }

  /** FR-10 + FR-8: plain-language guidance, non-diagnostic. */
  private guidance(record: {
    heightSds: unknown;
    weightSds: unknown;
    bmiPercentile: unknown;
  }): { message: string; flagged: boolean; nutritionalStatus: string | null } {
    const heightSds =
      record.heightSds !== null ? Number(record.heightSds) : null;
    const weightSds =
      record.weightSds !== null ? Number(record.weightSds) : null;
    const bmiPercentile =
      record.bmiPercentile !== null ? Number(record.bmiPercentile) : null;

    const flagged =
      (heightSds !== null && Math.abs(heightSds) > NOTABLE_Z_THRESHOLD) ||
      (weightSds !== null && Math.abs(weightSds) > NOTABLE_Z_THRESHOLD);

    const status =
      bmiPercentile !== null ? nutritionalStatus(bmiPercentile) : null;

    const message = flagged
      ? "This measurement falls notably outside the typical range for the child's age and sex. This is a screening signal, not a diagnosis — consider discussing it with a pediatrician."
      : "This measurement is within the typical range for the child's age and sex.";

    return { message, flagged, nutritionalStatus: status };
  }

  private attachGuidance<
    T extends {
      heightSds: unknown;
      weightSds: unknown;
      bmiPercentile: unknown;
    },
  >(record: T) {
    return { ...record, guidance: this.guidance(record) };
  }

  async create(userId: string, dto: CreateGrowthRecordDto) {
    await this.childrenService.assertGuardianAccess(dto.childId, userId);
    // FR-6 asks for height and weight; both are optional on the DTO so a parent can log
    // just one. Neither, though, stores a dated row with nothing in it — it shows up as a
    // blank line in the history and a gap in every chart.
    if (dto.heightCm === undefined && dto.weightKg === undefined) {
      throw new BadRequestException('Record at least one of height or weight');
    }
    const measuredAt = dto.measuredAt ? new Date(dto.measuredAt) : new Date();
    const metrics = await this.computeMetrics(
      dto.childId,
      measuredAt,
      dto.heightCm,
      dto.weightKg,
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
    const metrics = await this.computeMetrics(
      record.childId,
      measuredAt,
      heightCm,
      weightKg,
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
