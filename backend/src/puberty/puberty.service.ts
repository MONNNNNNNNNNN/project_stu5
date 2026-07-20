import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { SubmitPubertyScreeningDto } from './dto/submit-puberty-screening.dto';

@Injectable()
export class PubertyService {
  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
  ) {}

  async submit(userId: string, dto: SubmitPubertyScreeningDto) {
    await this.childrenService.assertGuardianAccess(dto.childId, userId);
    return this.prisma.pubertyScreening.create({
      data: {
        childId: dto.childId,
        tannerStage: dto.tannerStage,
        answers: dto.answers as any,
        notes: dto.notes,
      },
    });
  }

  async history(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    return this.prisma.pubertyScreening.findMany({
      where: { childId },
      orderBy: { assessedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const screening = await this.prisma.pubertyScreening.findUnique({ where: { id } });
    if (!screening) {
      throw new NotFoundException('Puberty screening not found');
    }
    await this.childrenService.assertGuardianAccess(screening.childId, userId);
    return screening;
  }
}
