import { Injectable, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { PrismaService } from '../prisma/prisma.service';

interface Row {
  hits: number;
  expiresAt: Date;
  blockedUntil: Date | null;
}

/**
 * Throttle counters kept in Postgres instead of in the Node process.
 *
 * The library's default storage is per-process. Render was running two instances, so each
 * held its own tally and the configured 10-per-minute login limit behaved like 20 — a
 * 30-attempt run first saw a 429 at attempt 19, and repeat runs were non-deterministic
 * depending on which instance answered. A limiter that advertises a limit it does not
 * enforce is worse than none, because it reads as protection.
 *
 * The whole read-modify-write is one statement so two instances racing on the same key
 * cannot both believe they took the last slot. Redis would be the usual answer; Postgres is
 * already provisioned here and the request rates involved are tiny, so it avoids standing up
 * another service for a class project.
 */
@Injectable()
export class PrismaThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(PrismaThrottlerStorage.name);

  constructor(private prisma: PrismaService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const id = `${throttlerName}:${key}`;

    try {
      const rows = await this.prisma.$queryRaw<Row[]>`
        INSERT INTO rate_limits ("key", "hits", "expiresAt")
        VALUES (${id}, 1, now() + make_interval(secs => ${ttl / 1000}::double precision))
        ON CONFLICT ("key") DO UPDATE SET
          "hits" = CASE
            WHEN rate_limits."expiresAt" <= now() THEN 1
            ELSE rate_limits."hits" + 1
          END,
          "expiresAt" = CASE
            WHEN rate_limits."expiresAt" <= now()
              THEN now() + make_interval(secs => ${ttl / 1000}::double precision)
            ELSE rate_limits."expiresAt"
          END,
          "blockedUntil" = CASE
            WHEN rate_limits."blockedUntil" IS NOT NULL AND rate_limits."blockedUntil" > now()
              THEN rate_limits."blockedUntil"
            WHEN rate_limits."expiresAt" > now() AND rate_limits."hits" + 1 > ${limit}
              THEN now() + make_interval(secs => ${blockDuration / 1000}::double precision)
            ELSE NULL
          END
        RETURNING "hits", "expiresAt", "blockedUntil"
      `;

      const row = rows[0];
      const now = Date.now();
      const blockedUntil = row.blockedUntil ? row.blockedUntil.getTime() : 0;
      const isBlocked = blockedUntil > now;

      return {
        totalHits: row.hits,
        timeToExpire: Math.max(
          0,
          Math.ceil((row.expiresAt.getTime() - now) / 1000),
        ),
        isBlocked,
        timeToBlockExpire: isBlocked
          ? Math.max(0, Math.ceil((blockedUntil - now) / 1000))
          : 0,
      };
    } catch (err) {
      // Fail open rather than locking every caller out of the app if the database blips.
      // Losing a rate limit for the duration of an outage is the lesser harm; the request
      // still has to pass authentication behind this.
      this.logger.error(
        `Rate-limit store unavailable for ${id}; allowing the request`,
        err as Error,
      );
      return {
        totalHits: 0,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
