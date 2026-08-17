import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { streamUpload } from '../common/uploads';

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
    const prediction = await this.prisma.boneAgePrediction.findUnique({
      where: { id },
    });
    if (!prediction) {
      throw new NotFoundException('Bone age prediction not found');
    }
    await this.childrenService.assertGuardianAccess(prediction.childId, userId);
    return prediction;
  }

  /**
   * The image bytes for a prediction. These are radiographs of a child, so they are read
   * through this guardian-checked route rather than served as static files — `findOne`
   * already enforces that the caller is a guardian of the child the scan belongs to.
   */
  async image(userId: string, id: string) {
    const prediction = await this.findOne(userId, id);
    return streamUpload('bone-age', prediction.imageUrl);
  }

  async remove(userId: string, id: string) {
    const prediction = await this.findOne(userId, id);
    await this.prisma.boneAgePrediction.delete({
      where: { id: prediction.id },
    });
    return { success: true };
  }
}
