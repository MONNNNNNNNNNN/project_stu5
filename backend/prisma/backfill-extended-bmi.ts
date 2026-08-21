/**
 * Recomputes bmiPercentile, bmiSds and bmiPctOfP95 on existing growth records.
 *
 *     npx ts-node prisma/backfill-extended-bmi.ts            # report what would change
 *     npx ts-node prisma/backfill-extended-bmi.ts --write    # apply it
 *
 * Needed because those columns are written once, when a record is created or edited, and are
 * never recomputed on read. Introducing CDC's extended percentiles therefore leaves every row
 * already in the database quoting the old, ceiling-limited maths.
 *
 * What actually moves:
 *   - at or above the 95th percentile, materially — the LMS tail could not exceed z ~ 3, so a
 *     severely obese child was stored several percentile points too low and with no pctOfP95
 *     at all
 *   - below the 95th, only in stored precision, as percentiles went from one decimal place to
 *     two (57 becomes 57.05)
 *
 * Not a Prisma migration on purpose: this needs the LMS tables, each child's date of birth
 * and sex, an interpolation, a complementary error function and a probit. Every migration in
 * this repo is pure DDL, and that is worth keeping true.
 *
 * Idempotent — running it twice changes nothing the second time. Run it once after the
 * bmiPctOfP95 migration has been applied.
 */

import { PrismaClient } from '@prisma/client';
import { GrowthReferenceService } from '../src/growth/growth-reference.service';
import { hasBmiForAge } from '../src/growth/growth.service';

const prisma = new PrismaClient();
const reference = new GrowthReferenceService();
const WRITE = process.argv.includes('--write');

/** Anything below this is the one-to-two decimal place change, not a real move. */
const MATERIAL_PERCENTILE_SHIFT = 0.05;

const asNumber = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function main() {
  // Soft-deleted rows are included deliberately: they are invisible today, but an undelete
  // would otherwise resurrect a percentile computed under the old maths.
  const records = await prisma.growthRecord.findMany({
    where: { bmi: { not: null } },
    include: { child: true },
    orderBy: { measuredAt: 'asc' },
  });

  console.log(
    `\n${WRITE ? 'Applying' : 'Dry run —'} extended BMI backfill over ${records.length} record(s) with a BMI\n`,
  );

  let material = 0;
  let precisionOnly = 0;
  let skipped = 0;
  const updates: { id: string; percentile: number; sds: number; pct: number }[] = [];

  for (const record of records) {
    const bmi = asNumber(record.bmi)!;
    const ageMonths = reference.ageInMonths(
      record.child.dateOfBirth,
      record.measuredAt,
    );

    // Same guard computeMetrics applies, via the same helper, so the two cannot drift.
    if (!hasBmiForAge(ageMonths)) {
      skipped++;
      continue;
    }

    const next = reference.compute('bmi', record.child.sex, ageMonths, bmi);
    if (!next || next.pctOfP95 === undefined) {
      skipped++;
      continue;
    }

    const oldPercentile = asNumber(record.bmiPercentile);
    const shift =
      oldPercentile === null ? Infinity : Math.abs(next.percentile - oldPercentile);

    if (shift >= MATERIAL_PERCENTILE_SHIFT) {
      material++;
      console.log(
        `  ${record.id}  BMI ${bmi.toFixed(2)}  ` +
          `pct ${oldPercentile ?? '—'} -> ${next.percentile}  ` +
          `sds ${asNumber(record.bmiSds) ?? '—'} -> ${next.z}  ` +
          `%P95 -> ${next.pctOfP95}`,
      );
    } else {
      precisionOnly++;
    }

    updates.push({
      id: record.id,
      percentile: next.percentile,
      sds: next.z,
      pct: next.pctOfP95,
    });
  }

  if (WRITE) {
    // Individual updates rather than updateMany: every row gets different values.
    await prisma.$transaction(
      updates.map((u) =>
        prisma.growthRecord.update({
          where: { id: u.id },
          data: {
            bmiPercentile: u.percentile,
            bmiSds: u.sds,
            bmiPctOfP95: u.pct,
          },
        }),
      ),
    );
  }

  console.log(
    `\n  ${material} row(s) moved by ${MATERIAL_PERCENTILE_SHIFT} percentile points or more` +
      `\n  ${precisionOnly} row(s) changed in stored precision only` +
      `\n  ${skipped} row(s) skipped (under five years, or no BMI-for-age)` +
      `\n\n${WRITE ? `wrote ${updates.length} row(s)` : 'nothing written — re-run with --write to apply'}\n`,
  );
}

main()
  .catch((err) => {
    console.error(`\n${(err as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
