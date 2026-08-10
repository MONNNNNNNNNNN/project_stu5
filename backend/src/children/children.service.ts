import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  private async assertGuardian(childId: string, userId: string) {
    return this.assertGuardianAccess(childId, userId);
  }

  /** Reused by growth/puberty/bone-age modules to verify a user may act on a child's records. */
  async assertGuardianAccess(childId: string, userId: string) {
    const link = await this.prisma.childGuardian.findUnique({
      where: { childId_userId: { childId, userId } },
    });
    if (!link) {
      throw new ForbiddenException('Not a guardian of this child');
    }
  }

  async create(userId: string, dto: CreateChildDto) {
    const { relation, ...childFields } = dto;
    return this.prisma.child.create({
      data: {
        ...childFields,
        dateOfBirth: new Date(dto.dateOfBirth),
        guardians: {
          create: { userId, isPrimary: true, relation },
        },
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.child.findMany({
      where: { deletedAt: null, guardians: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, childId: string) {
    await this.assertGuardian(childId, userId);
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child || child.deletedAt) {
      throw new NotFoundException('Child not found');
    }
    return child;
  }

  async update(userId: string, childId: string, dto: UpdateChildDto) {
    await this.assertGuardian(childId, userId);
    const { dateOfBirth, relation, ...rest } = dto;
    if (relation) {
      await this.prisma.childGuardian.update({
        where: { childId_userId: { childId, userId } },
        data: { relation },
      });
    }
    return this.prisma.child.update({
      where: { id: childId },
      data: { ...rest, ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}) },
    });
  }

  /**
   * A real delete, not a soft delete: the UI's confirm dialog promises this permanently
   * removes the child's growth/screening/bone-age history, so it has to actually do that
   * (growthRecords/pubertyScreenings/boneAgePredictions all cascade via the Child relation).
   * If this user is the sole guardian, the child itself is removed; if shared with another
   * guardian, only this user's guardian link is removed and the child stays for the other.
   */
  async remove(userId: string, childId: string) {
    await this.assertGuardian(childId, userId);
    const guardianCount = await this.prisma.childGuardian.count({ where: { childId } });
    if (guardianCount <= 1) {
      await this.prisma.child.delete({ where: { id: childId } });
    } else {
      await this.prisma.childGuardian.delete({ where: { childId_userId: { childId, userId } } });
    }
    return { success: true };
  }
}
