import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/**
 * Google sign-in, at the decisions that carry security weight:
 * verifying the token, linking to an existing account, and FR-2.
 *
 * `verifyIdToken` is stubbed. Testing that Google's own signature check works would be
 * testing google-auth-library; what matters here is what we do with the payload it returns,
 * and that we refuse the payloads we should.
 */

const verifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => verifyIdToken(...args),
  })),
}));

const CLIENT_ID = '850663910657-test.apps.googleusercontent.com';

type UserRow = Record<string, unknown> | null;

function build(existing: UserRow) {
  const created: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];

  const prisma = {
    user: {
      findFirst: async () => existing,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: 'new-user', role: 'PARENT', createdAt: new Date(), phoneNumber: null, ...data };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updated.push(data);
        return { ...(existing as object), ...data };
      },
    },
    session: { create: async () => ({}) },
  } as unknown as PrismaService;

  const config = {
    get: (k: string) => (k === 'GOOGLE_CLIENT_ID' ? CLIENT_ID : undefined),
    getOrThrow: (k: string) => (k === 'JWT_ACCESS_SECRET' ? 'secret' : '15m'),
  } as unknown as ConfigService;

  const jwt = { signAsync: async () => 'access-token' } as unknown as JwtService;
  const mail = {} as MailService;

  return { service: new AuthService(prisma, jwt, config, mail), created, updated };
}

const googlePayload = (over: Record<string, unknown> = {}) => ({
  getPayload: () => ({
    sub: 'google-subject-1',
    email: 'Parent@Example.com',
    email_verified: true,
    name: 'A Parent',
    picture: 'https://example.com/a.png',
    ...over,
  }),
});

beforeEach(() => verifyIdToken.mockReset());

describe('googleLogin', () => {
  it('checks the token was minted for this application', async () => {
    verifyIdToken.mockResolvedValue(googlePayload());
    const { service } = build(null);
    await service.googleLogin({ credential: 'tok', acceptedTerms: true });

    // Without the audience check, any valid Google ID token from any app would be accepted.
    expect(verifyIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ idToken: 'tok', audience: CLIENT_ID }),
    );
  });

  it('rejects a token Google will not verify', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token signature'));
    const { service } = build(null);
    await expect(
      service.googleLogin({ credential: 'forged', acceptedTerms: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // Linking by email is only safe because Google vouches for the address. An unverified one
  // would let anyone who can add someone else's address to a Google account take it over.
  it('refuses an unverified Google email address', async () => {
    verifyIdToken.mockResolvedValue(googlePayload({ email_verified: false }));
    const { service } = build(null);
    await expect(
      service.googleLogin({ credential: 'tok', acceptedTerms: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('creating an account', () => {
    it('refuses without accepted terms — FR-2', async () => {
      verifyIdToken.mockResolvedValue(googlePayload());
      const { service, created } = build(null);
      await expect(
        service.googleLogin({ credential: 'tok', acceptedTerms: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(created).toHaveLength(0);
    });

    it('stores no password, records consent, and normalises the email', async () => {
      verifyIdToken.mockResolvedValue(googlePayload());
      const { service, created } = build(null);
      await service.googleLogin({ credential: 'tok', acceptedTerms: true });

      expect(created).toHaveLength(1);
      expect(created[0].passwordHash).toBeNull();
      expect(created[0].email).toBe('parent@example.com');
      expect(created[0].googleId).toBe('google-subject-1');
      expect(created[0].isVerified).toBe(true);
      expect(created[0].termsAcceptedAt).toBeInstanceOf(Date);
    });
  });

  describe('an account that already exists', () => {
    const passwordAccount = {
      id: 'u1',
      email: 'parent@example.com',
      fullName: 'A Parent',
      phoneNumber: null,
      role: 'PARENT',
      avatarUrl: null,
      isVerified: false,
      createdAt: new Date(),
      googleId: null,
      deletedAt: null,
    };

    it('links the first Google sign-in instead of creating a duplicate', async () => {
      verifyIdToken.mockResolvedValue(googlePayload());
      const { service, created, updated } = build(passwordAccount);
      await service.googleLogin({ credential: 'tok' });

      expect(created).toHaveLength(0);
      expect(updated).toHaveLength(1);
      expect(updated[0].googleId).toBe('google-subject-1');
    });

    it('does not ask an existing account to accept terms again', async () => {
      verifyIdToken.mockResolvedValue(googlePayload());
      const { service } = build(passwordAccount);
      // No acceptedTerms at all — they agreed when they registered.
      await expect(service.googleLogin({ credential: 'tok' })).resolves.toHaveProperty(
        'accessToken',
      );
    });

    it('refuses a deleted account', async () => {
      verifyIdToken.mockResolvedValue(googlePayload());
      const { service } = build({ ...passwordAccount, deletedAt: new Date() });
      await expect(service.googleLogin({ credential: 'tok' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('never returns the password hash or the Google id', async () => {
      verifyIdToken.mockResolvedValue(googlePayload());
      const { service } = build({ ...passwordAccount, googleId: 'google-subject-1' });
      const result = await service.googleLogin({ credential: 'tok' });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('googleId');
    });
  });

  it('refuses to run at all when the client id is unset', async () => {
    const prisma = { user: {}, session: {} } as unknown as PrismaService;
    const config = { get: () => undefined, getOrThrow: () => 'x' } as unknown as ConfigService;
    const service = new AuthService(
      prisma,
      { signAsync: async () => 't' } as unknown as JwtService,
      config,
      {} as MailService,
    );
    // Better a clear misconfiguration error than accepting tokens with no audience to check.
    await expect(
      service.googleLogin({ credential: 'tok', acceptedTerms: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
