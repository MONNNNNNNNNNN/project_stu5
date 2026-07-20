import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { UpdateGrowthRecordDto } from './dto/update-growth-record.dto';

function computeBmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

@Injectable()
export class GrowthService {
  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
  ) {}

  async create(userId: string, dto: CreateGrowthRecordDto) {
    await this.childrenService.assertGuardianAccess(dto.childId, userId);
    const bmi = computeBmi(dto.heightCm, dto.weightKg);

    return this.prisma.growthRecord.create({
      data: {
        childId: dto.childId,
        measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        bmi: bmi ?? undefined,
        note: dto.note,
      },
    });
  }

  async findAll(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    return this.prisma.growthRecord.findMany({
      where: { childId, deletedAt: null },
      orderBy: { measuredAt: 'desc' },
    });
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
    const heightCm = dto.heightCm ?? Number(record.heightCm) ?? undefined;
    const weightKg = dto.weightKg ?? Number(record.weightKg) ?? undefined;
    const bmi = computeBmi(heightCm, weightKg);

    return this.prisma.growthRecord.update({
      where: { id },
      data: {
        ...dto,
        measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : undefined,
        bmi: bmi ?? undefined,
      },
    });
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
      select: { measuredAt: true, heightCm: true, weightKg: true, bmi: true },
    });
    return records.map((r) => ({
      date: r.measuredAt,
      heightCm: r.heightCm ? Number(r.heightCm) : null,
      weightKg: r.weightKg ? Number(r.weightKg) : null,
      bmi: r.bmi ? Number(r.bmi) : null,
    }));
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
      return { latest: null, heightDeltaCm: null, weightDeltaKg: null, since: null };
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
      latest,
      heightDeltaCm,
      weightDeltaKg,
      since: previous?.measuredAt ?? null,
    };
  }

  bmi(heightCm: number, weightKg: number) {
    if (!heightCm || !weightKg) {
      throw new BadRequestException('heightCm and weightKg query params are required');
    }
    return { bmi: computeBmi(heightCm, weightKg) };
  }

  percentile(): never {
    throw new NotImplementedException(
      'Growth percentile calculation requires the WHO/CDC LMS reference dataset — not yet integrated. Follow-up task.',
    );
  }

  sds(): never {
    throw new NotImplementedException(
      'Growth SDS (z-score) calculation requires the WHO/CDC LMS reference dataset — not yet integrated. Follow-up task.',
    );
  }
}
