/**
 * Colours for the growth charts, per theme.
 *
 * These used to be hardcoded light-mode hexes passed in as a `color` prop, which meant the
 * grid and axis labels stayed light-mode values on the dark surface, and several strokes
 * sat below the 3:1 WCAG 1.4.11 floor for meaningful graphics (the P3/P97 band was 1.53:1
 * on white — effectively invisible, and it is the band the whole chart exists to show).
 * Every value below is checked against its own background.
 */
export type Measure = 'height' | 'weight' | 'bmi';

interface ChartPalette {
  band: string;
  median: string;
  grid: string;
  tick: string;
  series: Record<Measure, string>;
}

const LIGHT: ChartPalette = {
  band: '#6f9280', //  3.44:1 on #ffffff
  median: '#4d7360', //  5.33:1
  grid: '#d8e0d5', //  decorative rule, deliberately subtle
  tick: '#4a5565', //  7.56:1
  series: {
    height: '#2f7566', // 5.44:1
    weight: '#547150', // 5.45:1
    bmi: '#9c6626', // 4.84:1
  },
};

const DARK: ChartPalette = {
  band: '#6d9686', //  4.84:1 on #16213a
  median: '#8fbcab', //  7.58:1
  grid: '#2b3a57',
  tick: '#a7b1cc', //  7.47:1
  series: {
    height: '#5fe4d4', // 10.31:1
    weight: '#b6d9ae', // 10.30:1
    bmi: '#efb96e', //  9.02:1
  },
};

export function chartPalette(mode: 'light' | 'dark'): ChartPalette {
  return mode === 'dark' ? DARK : LIGHT;
}

/**
 * The age window a chart should actually show.
 *
 * The reference tables run birth to 20 years. Plotting all of that for a child with two
 * years of measurements squeezed their line into a sliver and turned the percentile bands
 * into near-vertical diagonals — the comparison the chart exists to make became unreadable.
 * Frame it on the child's own data instead, with enough margin either side to see where the
 * trend is heading. With no data yet, fall back to the full range.
 */
const PAD_BEFORE_MONTHS = 12;
const PAD_AFTER_MONTHS = 24;

export function ageWindow(
  points: { ageMonths: number; value: number | null }[],
  fallback: [number, number],
): [number, number] {
  const ages = points.filter((p) => p.value !== null).map((p) => p.ageMonths);
  if (ages.length === 0) return fallback;

  const lo = Math.max(fallback[0], Math.floor(Math.min(...ages)) - PAD_BEFORE_MONTHS);
  const hi = Math.min(fallback[1], Math.ceil(Math.max(...ages)) + PAD_AFTER_MONTHS);
  // A single measurement would otherwise produce a near-zero-width window.
  return hi - lo < 24 ? [Math.max(fallback[0], hi - 24), hi] : [lo, hi];
}

/**
 * Avatar colours. The background was hardcoded to #006b5f while the letter inside was left
 * to MUI, which derives its contrast text from the *theme* rather than from that fixed
 * background — so in dark mode it resolved to near-black on teal, 2.78:1. Setting both
 * together keeps the pair legible in either theme.
 */
export const avatarSx = (mode: 'light' | 'dark') =>
  mode === 'dark'
    ? { bgcolor: '#2dd4bf', color: '#0b1c30' } //  9.5:1
    : { bgcolor: '#006b5f', color: '#ffffff' }; //  6.7:1
