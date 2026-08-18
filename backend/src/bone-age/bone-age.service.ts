import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { basename, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { streamUpload, UPLOADS_ROOT } from '../common/uploads';
import { BoneAgeInferenceService } from './bone-age.inference';

@Injectable()
export class BoneAgeService {
  private readonly logger = new Logger(BoneAgeService.name);

  constructor(
    private prisma: PrismaService,
    private childrenService: ChildrenService,
    private inference: BoneAgeInferenceService,
  ) {}

  async upload(userId: string, childId: string, imageUrl: string) {
    await this.childrenService.assertGuardianAccess(childId, userId);
    const prediction = await this.prisma.boneAgePrediction.create({
      data: { childId, imageUrl },
    });

    // Deliberately not awaited. The client gets its PENDING row immediately and polls, so a
    // slow first inference cannot time out the upload request. runInference swallows its own
    // failures, so this can never surface as an unhandled rejection.
    void this.runInference(prediction.id);
    return prediction;
  }

  /** Resolves a PENDING row to COMPLETED or FAILED. Never throws — nothing awaits it. */
  private async runInference(id: string) {
    if (!this.inference.isReady) {
      this.logger.warn(`Bone-age model unavailable; ${id} stays PENDING.`);
      return;
    }

    try {
      const prediction = await this.prisma.boneAgePrediction.findUniqueOrThrow({
        where: { id },
        include: { child: true },
      });

      const file = join(
        UPLOADS_ROOT,
        'bone-age',
        basename(prediction.imageUrl),
      );
      const result = await this.inference.predict(file, prediction.child.sex);

      await this.prisma.boneAgePrediction.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          predictedAgeMonths: result.boneAgeMonths,
          modelVersion: result.provisional
            ? `${result.modelVersion} (provisional calibration)`
            : result.modelVersion,
          completedAt: new Date(),
          failureReason: null,
        },
      });
    } catch (err) {
      const reason = (err as Error).message ?? 'inference failed';
      this.logger.error(`Bone-age inference failed for ${id}: ${reason}`);
      await this.prisma.boneAgePrediction
        .update({
          where: { id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            failureReason: reason,
          },
        })
        .catch(() => undefined);
    }
  }

  /** Model availability and measured accuracy, for the UI to show alongside a result. */
  modelStatus() {
    return this.inference.status;
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
