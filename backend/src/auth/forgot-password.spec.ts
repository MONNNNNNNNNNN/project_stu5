import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createHash } from 'crypto';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/** In-memory stand-in for the one table this flow touches. */
const USER = {
  id: 'u1',
  email: 'parent@example.com',
  fullName: 'Test Parent',
  phoneNumber: '0812345678',
  role: 'PARENT',
  avatarUrl: null,
  isVerified: true,
  deletedAt: null,
  createdAt: new Date(),
  passwordHash: '',
  resetTokenHash: null as string | null,
  resetTokenExpiresAt: null as Date | null,
};

const prismaStub = {
  $connect: async () => {},
  $disconnect: async () => {},
  $queryRaw: async () => [
    { hits: 1, expiresAt: new Date(Date.now() + 60000), blockedUntil: null },
  ],
  user: {
    findUnique: async ({ where }: any) =>
      where.email === USER.email || where.id === USER.id ? USER : null,
    findFirst: async ({ where }: any) =>
      USER.resetTokenHash && where.resetTokenHash === USER.resetTokenHash
        ? USER
        : null,
    update: async ({ data }: any) => {
      Object.assign(USER, data);
      return USER;
    },
  },
};

/**
 * The whole password-reset chain, with only Resend's HTTP call intercepted: request →
 * token generated → hash persisted → email composed → emailed token accepted → replay
 * refused. The pieces were each verified by hand before; this pins them together, including
 * the production gate that stops the token being returned in the response body.
 */
describe('forgot-password → email → reset (full chain)', () => {
  let app: INestApplication;
  let sent: {
    to: string[];
    subject: string;
    text: string;
    html: string;
    from: string;
  } | null = null;
  const realFetch = global.fetch;
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.FRONTEND_URL = 'https://grow-th.vercel.app/';
    process.env.MAIL_FROM = 'GrowTH <noreply@hacklgroups.com>';
    process.env.NODE_ENV = 'production'; // the gate we care about

    global.fetch = (async (url: string, init: any) => {
      if (String(url).includes('api.resend.com')) {
        sent = JSON.parse(init.body);
        return { ok: true, status: 200, text: async () => 'ok' };
      }
      return realFetch(url, init);
    }) as any;

    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    app = m.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // NODE_ENV=production is set above to exercise the no-leak gate; restore it so the flag
    // does not bleed into whatever suite jest runs next.
    global.fetch = realFetch;
    process.env = savedEnv;
    await app?.close();
  });

  it('1. accepts the request and does NOT leak the token in production', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: USER.email })
      .expect(200);
    expect(res.body).toEqual({ success: true });
    expect(res.body.resetToken).toBeUndefined();
  });

  it('2. actually called Resend, with the right sender and recipient', () => {
    expect(sent).not.toBeNull();
    expect(sent!.to).toEqual([USER.email]);
    expect(sent!.from).toBe('GrowTH <noreply@hacklgroups.com>');
    expect(sent!.subject).toMatch(/reset/i);
  });

  it('3. the link points at the deployed frontend, with no double slash', () => {
    const link = sent!.text.match(/https?:\/\/\S+/)![0];
    expect(
      link.startsWith('https://grow-th.vercel.app/reset-password?token='),
    ).toBe(true);
    expect(link).not.toContain('//reset-password');
    expect(sent!.html).toContain(link);
  });

  it('4. only the hash is stored, never the token itself', () => {
    const token = sent!.text.match(/token=([a-f0-9]+)/)![1];
    expect(USER.resetTokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(USER.resetTokenHash).not.toBe(token);
    expect(USER.resetTokenExpiresAt!.getTime()).toBeGreaterThan(
      Date.now() + 55 * 60 * 1000,
    );
  });

  it('5. the emailed token completes the reset', async () => {
    const token = sent!.text.match(/token=([a-f0-9]+)/)![1];
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'newpassw0rd' })
      .expect(200);
    expect(USER.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt
  });

  it('6. the token is single-use — replay is rejected', async () => {
    const token = sent!.text.match(/token=([a-f0-9]+)/)![1];
    expect(USER.resetTokenHash).toBeNull();
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'anotherpass1' })
      .expect(401);
  });

  it('7. an unknown address reveals nothing', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nobody@example.invalid' })
      .expect(200);
    expect(res.body).toEqual({ success: true });
  });
});
