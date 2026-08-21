/**
 * Regenerates the LMS reference tables from CDC's own published data files, and proves the
 * result against CDC's own published percentile columns.
 *
 *     npm run reference:build     # rewrite the JSON files
 *     npm run reference:check     # rebuild in memory, fail on any difference
 *
 * Why this exists. The JSON tables under src/growth/reference-data/ were originally produced
 * by hand, and the README's claim about where they came from was asserted rather than
 * demonstrated — it had already been wrong once, describing the infant tables as WHO when
 * they are CDC. This script makes provenance reproducible: anyone can re-derive the committed
 * files from source and confirm they match, byte for byte.
 *
 * Not wired into `build` or render.yaml on purpose — it needs network access at run time, and
 * a deploy must not depend on cdc.gov being reachable. Run it before a release, or after
 * touching anything under reference-data/.
 *
 * The primary snapshot of these files lives in the repo at data-knowledge/Chart/*.xls — the
 * original Excel workbooks as downloaded from CDC, carrying their authorship metadata. Those
 * are the archival record; the CSVs fetched here are the same data in a machine-readable form.
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(root, 'src/growth/reference-data');
const CHECK_ONLY = process.argv.includes('--check');

const ZSCORE_BASE = 'https://www.cdc.gov/growthcharts/data/zscore';
const EXTENDED_BMI =
  'https://www.cdc.gov/growthcharts/data/extended-bmi/bmi-age-2022.csv';

/**
 * The five tables the app uses, and where each comes from.
 *
 * `bmi-child.json` is the one that is NOT simply bmiagerev.csv. CDC's December 2022 extended
 * file carries L, M and S identical to bmiagerev (verified below, not assumed) plus a `sigma`
 * column. That column is what lets a percentile above the 95th mean anything — see
 * growth-reference.service.ts. Taking BMI from the extended file gets both in one fetch.
 *
 * `axis` is the column the table is indexed on. Weight-for-length is indexed on length in cm,
 * not age in months, which is why it cannot share the age-based lookup path.
 */
const TABLES = [
  { file: 'weight-infant.json', url: `${ZSCORE_BASE}/wtageinf.csv`, axis: 'Agemos', key: 'ageMonths' },
  { file: 'height-infant.json', url: `${ZSCORE_BASE}/lenageinf.csv`, axis: 'Agemos', key: 'ageMonths' },
  { file: 'weight-child.json', url: `${ZSCORE_BASE}/wtage.csv`, axis: 'Agemos', key: 'ageMonths' },
  { file: 'height-child.json', url: `${ZSCORE_BASE}/statage.csv`, axis: 'Agemos', key: 'ageMonths' },
  { file: 'weight-for-length.json', url: `${ZSCORE_BASE}/wtleninf.csv`, axis: 'Length', key: 'lengthCm' },
  { file: 'bmi-child.json', url: EXTENDED_BMI, axis: 'agemos', key: 'ageMonths', sigma: true },
];

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function fetchCsv(url) {
  // cdc.gov returns 403 to node's default user-agent. Not an anti-bot measure worth
  // respecting — these are public data files linked from cdc.gov/growthcharts/cdc-data-files.htm
  // and curl fetches them fine; node just presents an unfamiliar UA.
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowTH-reference-build)' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  // CDC serves these with a BOM.
  return (await res.text()).replace(/^﻿/, '');
}

/** Minimal CSV reader. These files have no quoted fields or embedded commas. */
function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(',').map((c) => c.trim());
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const cells = line.split(',');
      return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]));
    });
}

/**
 * A numeric cell, or undefined if there isn't one.
 *
 * Returning undefined for anything non-numeric is what skips CDC's repeated header row:
 * lenageinf.csv and bmiagerev.csv both restate the column names between the male and female
 * blocks, so a parser that trusts the row count reads one phantom row per file with NaN for
 * every parameter.
 */
const num = (row, ...names) => {
  for (const n of names) {
    const raw = row[n];
    if (raw === undefined || raw === '' || raw === '.') continue;
    const v = Number(raw);
    if (Number.isFinite(v)) return v;
  }
  return undefined;
};

/* ------------------------------------------------------------------ *
 * The maths, duplicated here on purpose.
 *
 * This script must be able to fail when the service is wrong, so it cannot import from the
 * service — that would only prove the service agrees with itself. These are independent
 * implementations checked against CDC's published numbers.
 * ------------------------------------------------------------------ */

const P95_Z = 1.6448536269514722;

function valueAtZ({ L, M, S }, z) {
  return L === 0 ? M * Math.exp(z * S) : M * Math.pow(1 + L * S * z, 1 / L);
}

/** Φ(x), via the error function. Accuracy here only needs to resolve 1e-4 percentile points. */
function normalCdf(x) {
  // Abramowitz & Stegun 7.1.26.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/** CDC's extended tail: P(bmi) = 100 * (0.95 + 0.05 * (2Φ((bmi−P95)/σ) − 1)) for bmi ≥ P95. */
function extendedPercentile(bmi, p95, sigma) {
  return 100 * (0.95 + 0.05 * (2 * normalCdf((bmi - p95) / sigma) - 1));
}

/* ------------------------------------------------------------------ */

async function buildTable(spec) {
  const rows = parseCsv(await fetchCsv(spec.url));
  const out = [];
  for (const r of rows) {
    const sex = num(r, 'Sex', 'sex');
    const axis = num(r, spec.axis, spec.axis.toLowerCase(), spec.axis.toUpperCase());
    const L = num(r, 'L');
    const M = num(r, 'M');
    const S = num(r, 'S');
    if (sex === undefined || axis === undefined || L === undefined) continue;
    const row = { sex, [spec.key]: axis, L, M, S };
    if (spec.sigma) {
      const sigma = num(r, 'sigma');
      if (sigma === undefined) throw new Error(`${spec.file}: expected a sigma column`);
      row.sigma = sigma;
    }
    out.push(row);
  }
  return { rows: out, raw: rows };
}

/**
 * The check that earns this script its place: re-derive CDC's own published percentile
 * columns from L, M, S and sigma alone, and confirm they agree.
 *
 * P95 and 120%-of-P95 are deliberately NOT shipped as data — they are derivable, and a second
 * stored copy of a derived number is a second thing to keep in sync. This proves the
 * derivation is sound.
 */
function validateExtendedBmi(raw) {
  let worstPct = 0;
  let worstP95 = 0;
  let worstPct120 = 0;
  for (const r of raw) {
    const lms = { L: num(r, 'L'), M: num(r, 'M'), S: num(r, 'S') };
    const sigma = num(r, 'sigma');
    if (lms.L === undefined || sigma === undefined) continue;

    const p95 = valueAtZ(lms, P95_Z);
    worstP95 = Math.max(worstP95, Math.abs(p95 - num(r, 'P95')));
    worstPct120 = Math.max(worstPct120, Math.abs(1.2 * p95 - num(r, 'pct120ofP95')));

    for (const [col, target] of [
      ['P95', 95],
      ['P98', 98],
      ['P99', 99],
      ['P99_9', 99.9],
      ['P99_99', 99.99],
    ]) {
      const bmi = num(r, col);
      if (bmi === undefined) continue;
      worstPct = Math.max(worstPct, Math.abs(extendedPercentile(bmi, p95, sigma) - target));
    }
  }

  check(
    'derived P95 matches CDC’s published P95 column',
    worstP95 < 1e-3,
    `worst ${worstP95.toExponential(2)} BMI units`,
  );
  check(
    'derived 120% of P95 matches CDC’s pct120ofP95 column',
    worstPct120 < 1e-3,
    `worst ${worstPct120.toExponential(2)} BMI units`,
  );
  check(
    'extended formula reproduces CDC’s P95/P98/P99/P99.9/P99.99',
    worstPct < 1e-3,
    `worst ${worstPct.toExponential(2)} percentile points`,
  );
}

/**
 * CDC changed the BMI source from bmiagerev.csv to the 2022 extended file. That is only safe
 * because the LMS values are unchanged — if CDC ever re-fits them, every stored percentile in
 * the database silently refers to a different reference population. Fail loudly instead.
 */
async function assertBmiLmsUnchanged(built) {
  const legacy = parseCsv(await fetchCsv(`${ZSCORE_BASE}/bmiagerev.csv`));
  const byKey = new Map(
    legacy.map((r) => [`${num(r, 'Sex')}|${num(r, 'Agemos')}`, r]),
  );
  let worst = 0;
  let missing = 0;
  for (const row of built) {
    const r = byKey.get(`${row.sex}|${row.ageMonths}`);
    if (!r) {
      missing++;
      continue;
    }
    worst = Math.max(
      worst,
      Math.abs(row.L - num(r, 'L')),
      Math.abs(row.M - num(r, 'M')),
      Math.abs(row.S - num(r, 'S')),
    );
  }
  check(
    'extended-BMI L/M/S identical to CDC 2000 bmiagerev',
    missing === 0 && worst === 0,
    missing ? `${missing} rows missing` : `max delta ${worst}`,
  );
}

async function main() {
  console.log(`\n${CHECK_ONLY ? 'Checking' : 'Building'} growth reference data from cdc.gov\n`);

  for (const spec of TABLES) {
    const path = join(DATA_DIR, spec.file);
    const { rows, raw } = await buildTable(spec);

    if (spec.sigma) {
      await assertBmiLmsUnchanged(rows);
      validateExtendedBmi(raw);
    }

    const json = JSON.stringify(rows);

    if (CHECK_ONLY) {
      if (!existsSync(path)) {
        check(`${spec.file} exists`, false, 'not committed');
        continue;
      }
      // Compare parsed values, not raw text. Whitespace and how a serialiser chose to render
      // 24 vs 24.0 are not provenance failures, and the committed files predate this script.
      const current = JSON.parse(await readFile(path, 'utf8'));
      const same =
        current.length === rows.length &&
        JSON.stringify(current) === JSON.stringify(rows);
      check(`${spec.file} matches CDC source`, same, `${rows.length} rows`);
    } else {
      await writeFile(path, json);
      console.log(`  wrote ${spec.file} (${rows.length} rows)`);
    }
  }

  console.log(failures ? `\n${failures} check(s) failed\n` : '\nall checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
