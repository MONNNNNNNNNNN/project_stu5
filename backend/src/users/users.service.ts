import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    role: string;
    avatarUrl: string | null;
    isVerified: boolean;
    createdAt: Date;
  }) {
    const { id, email, fullName, phoneNumber, role, avatarUrl, isVerified, createdAt } = user;
    return { id, email, fullName, phoneNumber, role, avatarUrl, isVerified, createdAt };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.sanitize(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.sanitize(user);
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return this.sanitize(user);
  }

  /**
   * Hard-deletes the account (not a soft delete): a prior soft-delete implementation left the
   * email permanently stuck (unique constraint kept blocking re-registration with that email).
   * Children this user is the sole guardian of are deleted along with their growth/screening/
   * bone-age history; children shared with another guardian are left intact for that guardian.
   */
  async deleteMe(userId: string) {
    const links = await this.prisma.childGuardian.findMany({
      where: { userId },
      select: { childId: true },
    });
    const childIds = links.map((l) => l.childId);

    if (childIds.length > 0) {
      const guardianCounts = await this.prisma.childGuardian.groupBy({
        by: ['childId'],
        where: { childId: { in: childIds } },
        _count: { userId: true },
      });
      const soleGuardianChildIds = guardianCounts
        .filter((c) => c._count.userId === 1)
        .map((c) => c.childId);
      if (soleGuardianChildIds.length > 0) {
        await this.prisma.child.deleteMany({ where: { id: { in: soleGuardianChildIds } } });
      }
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
