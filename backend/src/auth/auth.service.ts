import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const REFRESH_TOKEN_BYTES = 48;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
        expiresIn: this.config.getOrThrow<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as any,
      },
    );

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
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
    const {
      id,
      email,
      fullName,
      phoneNumber,
      role,
      avatarUrl,
      isVerified,
      createdAt,
    } = user;
    return {
      id,
      email,
      fullName,
      phoneNumber,
      role,
      avatarUrl,
      isVerified,
      createdAt,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // A Google-only account has no hash. bcrypt.compare throws on a null hash rather than
    // returning false, so without this the request 500s instead of failing authentication —
    // and a 500 here is also an account-existence oracle.
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  /**
   * Sign in with Google, via an ID token from Google Identity Services.
   *
   * The ID-token flow rather than the authorization-code flow: this is a SPA with its own JWT
   * sessions, so all we need from Google is a trustworthy assertion of who the user is. That
   * needs only the public client ID to verify — no client secret is involved anywhere, which
   * is one fewer credential to leak.
   *
   * `verifyIdToken` checks Google's signature against their published keys, the expiry, the
   * issuer, and that the audience is *our* client ID. That last check is what stops someone
   * presenting a valid Google token minted for a different application.
   */
  async googleLogin(dto: GoogleLoginDto) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      this.logger.error('GOOGLE_CLIENT_ID is not set — refusing Google sign-in');
      throw new BadRequestException('Google sign-in is not configured');
    }

    let payload;
    try {
      const ticket = await new OAuth2Client(clientId).verifyIdToken({
        idToken: dto.credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      // Deliberately not logging the token or the underlying error text — it can contain the
      // credential itself.
      throw new UnauthorizedException('Could not verify that Google sign-in');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Google did not return an email address');
    }

    // Linking an existing account by email is only safe because Google has verified it. An
    // unverified address would let anyone who can create a Google account with someone else's
    // address walk into their account.
    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'That Google account has an unverified email address',
      );
    }

    const email = payload.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email }] },
    });

    if (existing?.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (existing) {
      // First Google sign-in on an account that registered with a password: record the link
      // so a later Google email change still resolves here.
      const user = existing.googleId
        ? existing
        : await this.prisma.user.update({
            where: { id: existing.id },
            data: { googleId: payload.sub, isVerified: true },
          });
      const tokens = await this.issueTokens(user);
      return { user: this.sanitizeUser(user), ...tokens };
    }

    // FR-2: terms have to be accepted before an account exists, and the Google button skips
    // the registration form that normally enforces that. The client is expected to collect it
    // and send it; this is the server-side half, so a crafted request cannot bypass it.
    if (dto.acceptedTerms !== true) {
      throw new BadRequestException(
        'You must accept the terms of use and privacy notice to create an account',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        googleId: payload.sub,
        // No password. `login` refuses these accounts before it reaches bcrypt.
        passwordHash: null,
        fullName: payload.name ?? email.split('@')[0],
        avatarUrl: payload.picture ?? null,
        // Google has already verified the address, which is what this flag means.
        isVerified: true,
        termsAcceptedAt: new Date(),
      },
    });

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
    if (sent) {
      return { success: true };
    }

    // Outside production, hand the token straight back so the reset flow stays testable
    // without a mail provider. Never in production: this endpoint is unauthenticated, so a
    // live token in the response body turns "I know this email address" into full account
    // takeover the moment mail is misconfigured or the provider has an outage — which is
    // precisely when this branch runs.
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error(
        `Password reset requested for ${user.email} but no mail transport is configured — ` +
          'the user received nothing. Set RESEND_API_KEY (or SMTP_HOST/PORT/USER/PASS).',
      );
      return { success: true };
    }

    return { success: true, resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { resetTokenHash: hashToken(token) },
    });

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // A Google-only account has no current password to verify against. Letting it through on
    // an empty comparison would turn "change password" into "set a password on any account
    // whose session you hold", so it is refused outright. Setting a first password on a
    // Google account needs its own flow with its own proof of ownership; it does not exist yet.
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account signs in with Google and has no password to change.',
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return this.sanitizeUser(user);
  }
}
