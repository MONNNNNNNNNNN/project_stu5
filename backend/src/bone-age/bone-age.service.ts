import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';

@Injectable()
export class BoneAgeService {
  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
  ) {}

  async upload(userId: string, childId: string, imageUrl: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    return this.prisma.boneAgePrediction.create({
      data: { childId, imageUrl },
    });
  }

  /**
   * The bone-age inference model is being trained separately by the AI team and is not
   * wired in yet — this stays a stub until that model lands. It intentionally does not
   * fabricate a predicted age.
   */
  predict(): never {
    throw new NotImplementedException(
      'AI bone age prediction is not connected yet — the model is being trained separately and will be wired in here.',
    );
  }

  async history(userId: string, childId: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    return this.prisma.boneAgePrediction.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const prediction = await this.prisma.boneAgePrediction.findUnique({ where: { id } });
    if (!prediction) {
      throw new NotFoundException('Bone age prediction not found');
    }
    await this.childrenService.assertGuardianAccess(prediction.childId, userId);
    return prediction;
  }

  async remove(userId: string, id: string) {
    const prediction = await this.findOne(userId, id);
    await this.prisma.boneAgePrediction.delete({ where: { id: prediction.id } });
    return { success: true };
  }
}
