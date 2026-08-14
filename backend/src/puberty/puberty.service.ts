import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { SubmitPubertyScreeningDto } from './dto/submit-puberty-screening.dto';
import {
  buildMonitoringPlan,
  compilePubertyResult,
  MonitoringPlan,
  PubertyScreeningResult,
} from './puberty-screening.util';

@Injectable()
export class PubertyService {
  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
  ) {}

  private ageYears(dateOfBirth: Date, on: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return (on.getTime() - dateOfBirth.getTime()) / msPerDay / 365.25;
  }

  async submit(userId: string, dto: SubmitPubertyScreeningDto) {
    await this.childrenService.assertGuardianAccess(dto.childId, userId);
    const child = await this.prisma.child.findUniqueOrThrow({ where: { id: dto.childId } });
    const assessedAt = new Date();
    const ageYearsNow = this.ageYears(child.dateOfBirth, assessedAt);
    const result = compilePubertyResult(child.sex, ageYearsNow, dto.answers);

    const screening = await this.prisma.pubertyScreening.create({
      data: {
        childId: dto.childId,
        answers: dto.answers as any,
        notes: dto.notes,
        assessedAt,
      },
    });
    return { ...screening, result };
  }

  async history(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const child = await this.prisma.child.findUniqueOrThrow({ where: { id: childId } });
    const screenings = await this.prisma.pubertyScreening.findMany({
      where: { childId },
      orderBy: { assessedAt: 'desc' },
    });
    return screenings.map((s) => ({
      ...s,
      result: compilePubertyResult(child.sex, this.ageYears(child.dateOfBirth, s.assessedAt), s.answers as any),
    }));
  }

  /**
   * The follow-up schedule that a flagged screening starts. Derived from screening
   * history rather than stored, so there's no separate state to keep in sync with the
   * screenings themselves.
   */
  async plan(userId: string, childId: string): Promise<MonitoringPlan> {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const child = await this.prisma.child.findUniqueOrThrow({ where: { id: childId } });
    const screenings = await this.prisma.pubertyScreening.findMany({
      where: { childId },
      orderBy: { assessedAt: 'desc' },
    });
    return buildMonitoringPlan(
      screenings.map((s) => ({
        assessedAt: s.assessedAt,
        result: compilePubertyResult(child.sex, this.ageYears(child.dateOfBirth, s.assessedAt), s.answers as any),
      })),
    );
  }

  async findOne(userId: string, id: string): Promise<{ result: PubertyScreeningResult } & Record<string, unknown>> {
    const screening = await this.prisma.pubertyScreening.findUnique({ where: { id } });
    if (!screening) {
      throw new NotFoundException('Puberty screening not found');
    }
    await this.childrenService.assertGuardianAccess(screening.childId, userId);
    const child = await this.prisma.child.findUniqueOrThrow({ where: { id: screening.childId } });
    const result = compilePubertyResult(
      child.sex,
      this.ageYears(child.dateOfBirth, screening.assessedAt),
      screening.answers as any,
    );
    return { ...screening, result };
  }
}
