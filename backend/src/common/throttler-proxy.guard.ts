import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limit key that survives Render's edge.
 *
 * `app.set('trust proxy', 1)` was not enough: behind Render the counter kept resetting
 * mid-window (x-ratelimit-remaining ran 7 … 2 … 1 … 6), because requests resolved to more
 * than one key and each stayed under the limit. Thirteen consecutive login attempts never
 * produced a 429 — a limiter that advertises a limit but does not enforce one is worse than
 * none, because it reads as protection.
 *
 * X-Forwarded-For is `client, proxy1, proxy2…`. The *last* entry is the address the edge
 * itself observed, so it is stable across connections and cannot be set by the caller —
 * unlike the leftmost entry, which a client can forge to win a fresh bucket per request.
 */
@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const header = req.headers['x-forwarded-for'];
    const chain = Array.isArray(header) ? header.join(',') : header;

    if (typeof chain === 'string' && chain.trim()) {
      const hops = chain
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
      if (hops.length) return Promise.resolve(hops[hops.length - 1]);
    }

    return Promise.resolve(req.ip ?? req.socket.remoteAddress ?? 'unknown');
  }
}
