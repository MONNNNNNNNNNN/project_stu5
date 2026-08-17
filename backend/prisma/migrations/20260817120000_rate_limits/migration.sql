-- Shared rate-limit counters.
--
-- @nestjs/throttler's default storage lives in the process. Render was serving two
-- instances, so each kept its own tally and a limit of 10/min was really 20/min — a
-- 30-attempt login run first saw 429 at attempt 19. Counters have to be shared to mean
-- anything, and Postgres is already here, so it does the job without adding Redis.
CREATE TABLE "rate_limits" (
  "key"           TEXT        PRIMARY KEY,
  "hits"          INTEGER     NOT NULL DEFAULT 0,
  "expiresAt"     TIMESTAMPTZ NOT NULL,
  "blockedUntil"  TIMESTAMPTZ
);

-- Lets expired rows be swept cheaply.
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits" ("expiresAt");
