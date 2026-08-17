import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limit key for requests arriving through Render's proxy.
 *
 * Two earlier attempts got this wrong, both visible in production as two interleaved
 * counters (x-ratelimit-remaining running 9,8,7… and 9,9,8… at the same time) and a limit
 * of 10 that only tripped around attempt 19 of 30:
 *
 *   - `app.set('trust proxy', 1)` — Express then fell back to the socket address, which is
 *     Render's internal proxy and differs per instance.
 *   - the *last* X-Forwarded-For hop — also Render-internal, and likewise per-instance.
 *
 * Render sets the real client as the *first* entry of X-Forwarded-For, so that is what is
 * used here. The trade-off is that a caller can prepend their own X-Forwarded-For and win a
 * fresh bucket per request. That is a deliberate act, and it does not get them past the
 * password check behind this guard; the limit exists to stop naive credential stuffing and
 * accidental floods, which it now actually does.
 */
@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const header = req.headers['x-forwarded-for'];
    const chain = Array.isArray(header) ? header.join(',') : header;

    if (typeof chain === 'string' && chain.trim()) {
      const first = chain.split(',')[0]?.trim();
      if (first) return Promise.resolve(first);
    }

    return Promise.resolve(req.ip ?? req.socket.remoteAddress ?? 'unknown');
  }
}
