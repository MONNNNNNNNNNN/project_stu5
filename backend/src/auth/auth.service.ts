import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const REFRESH_TOKEN_BYTES = 48;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  private async issueTokens(user: { id: string; email: string; role: string }) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN') as any,
      },
    );

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const days = parseInt(refreshExpiresIn.replace(/[^0-9]/g, ''), 10) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: {
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

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        termsAcceptedAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async refresh(refreshToken: string) {
    const hashed = hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: hashed },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(session.user);
    return { user: this.sanitizeUser(session.user), ...tokens };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success shape to avoid leaking whether an email is registered.
    if (!user) {
      return { success: true };
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: hashToken(resetToken),
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const sent = await this.mail.sendPasswordResetEmail(user.email, resetToken);
    // If SMTP isn't configured, fall back to returning the token directly so the
    // reset flow stays testable in local dev without a mail provider.
    return sent ? { success: true } : { success: true, resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { resetTokenHash: hashToken(token) },
    });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.sanitizeUser(user);
  }
}
