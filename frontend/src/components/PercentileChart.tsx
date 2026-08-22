import { Area, ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useThemeMode } from '../context/ThemeModeContext';
import { ageWindow, bandFills, chartPalette, type Measure } from '../lib/chartTheme';
import type { ReferenceCurvePoint } from '../types';

interface Props {
  title: string;
  unit: string;
  curve: ReferenceCurvePoint[];
  points: { ageMonths: number; value: number | null }[];
  measure: Measure;
  /** Caveat printed under the chart. Lives inside the card so it lines up with the title. */
  footnote?: string;
}

/** Reference values are raw LMS output — one decimal is all a parent needs, and all the axis has room for. */
const fmt = (n: number) => n.toFixed(1);

function nearestCurvePoint(curve: ReferenceCurvePoint[], ageMonths: number) {
  if (curve.length === 0) return null;
  return curve.reduce((best, c) =>
    Math.abs(c.ageMonths - ageMonths) < Math.abs(best.ageMonths - ageMonths) ? c : best,
  );
}

interface ReferenceTooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: Array<{ dataKey?: string; value?: number }>;
  unit: string;
  title: string;
  curve: ReferenceCurvePoint[];
}

function ReferenceTooltip({ active, label, payload, unit, title, curve }: ReferenceTooltipProps) {
  if (!active || label === undefined) return null;
  const ageMonths = Number(label);
  const ref = nearestCurvePoint(curve, ageMonths);
  const actual = payload?.find((p) => p.dataKey === 'value')?.value as number | undefined;

  // BMI reads against the obesity lines, not against P97 — that is what the bands mean here.
  const isBmi = ref?.p95 !== undefined;

  let status: string | null = null;
  if (actual !== undefined && ref) {
    if (isBmi && actual >= ref.p120ofP95!)
      status = `Severe obesity range (at or above 120% of P95: ${fmt(ref.p120ofP95!)}${unit})`;
    else if (isBmi && actual >= ref.p95!)
      status = `Obesity range (at or above P95: ${fmt(ref.p95!)}${unit})`;
    else if (actual < ref.p3) status = `Below the typical reference range (P3: ${fmt(ref.p3)}${unit})`;
    else if (!isBmi && actual > ref.p97)
      status = `Above the typical reference range (P97: ${fmt(ref.p97)}${unit})`;
    else if (isBmi) status = `Below the obesity threshold (P95: ${fmt(ref.p95!)}${unit})`;
    else status = `Within the typical reference range (P3–P97: ${fmt(ref.p3)}–${fmt(ref.p97)}${unit})`;
  }

  const outside =
    actual !== undefined &&
    ref !== null &&
    (actual < ref.p3 || (isBmi ? actual >= ref.p95! : actual > ref.p97));

  return (
    <div className="bg-surface border border-brand-100 rounded-xl shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-ink mb-1">Age: {(ageMonths / 12).toFixed(1)} years</p>
      {actual !== undefined && (
        <p className="text-ink">
          {title}: <span className="font-semibold">{actual}{unit}</span>
        </p>
      )}
      {ref && <p className="text-gray-500">Reference median (P50): {fmt(ref.p50)}{unit}</p>}
      {status && <p className={outside ? 'text-amber-600 mt-1' : 'text-brand-600 mt-1'}>{status}</p>}
    </div>
  );
}

function ChartLegend({ items }: { items: { label: string; color: string; dashed: boolean }[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-gray-500">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0" y1="4" x2="18" y2="4"
              stroke={it.color}
              strokeWidth={it.dashed ? 1.5 : 2.5}
              strokeDasharray={it.dashed ? '4 3' : undefined}
            />
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export function PercentileChart({ title, unit, curve, points, measure, footnote }: Props) {
  const { mode } = useThemeMode();
  const c = chartPalette(mode);
  const fills = bandFills(mode);
  const seriesColor = c.series[measure];

  const actual = points
    .filter((p) => p.value !== null)
    .map((p) => ({ ageMonths: p.ageMonths, value: p.value }));

  // Frame on the child's data, then clip the reference band to the same window so the two
  // series share an x-range instead of the band dictating a 0-20y axis.
  const fullRange: [number, number] =
    curve.length > 0 ? [curve[0].ageMonths, curve[curve.length - 1].ageMonths] : [0, 240];
  const [from, to] = ageWindow(points, fullRange);
  const visibleCurve = curve.filter((p) => p.ageMonths >= from && p.ageMonths <= to);

  // Fixed order. Left to recharts, the legend came out differently on each of the three
  // cards (series first on height and BMI, last on weight) because it follows render
  // ordering — so the same four entries read in a different order on every chart. Rendering
  // it ourselves also keeps the reference lines painted *under* the child's line, which
  // declaration order alone would not allow.
  // BMI charts show P95 and 120%-of-P95 instead of P97. P97 has no clinical reading on a BMI
  // chart, and at ten years it sits about 1.2 BMI units from P95 — two dashed lines almost on
  // top of each other, neither of which is the line a clinician looks for.
  const hasObesityBands = visibleCurve.some((p) => p.p95 !== undefined);

  /**
   * An explicit y-domain, so the shaded zones can reach the top and bottom of the plot.
   *
   * With recharts' 'auto' domain the outermost bands would have nothing to extend to, and
   * feeding them a large sentinel value to reach would drag the axis out to meet it.
   */
  const yValues = [
    ...visibleCurve.flatMap((p) =>
      [p.p3, p.p50, p.p97, p.p5, p.p85, p.p95, p.p120ofP95].filter(
        (v): v is number => v !== undefined,
      ),
    ),
    ...actual.map((p) => p.value as number),
  ];
  const yLo = yValues.length ? Math.min(...yValues) : 0;
  const yHi = yValues.length ? Math.max(...yValues) : 1;
  const pad = (yHi - yLo) * 0.08 || 1;
  const domain: [number, number] = [
    Math.max(0, Math.floor(yLo - pad)),
    Math.ceil(yHi + pad),
  ];

  /**
   * The shaded zones, as [low, high] pairs recharts draws as ranged areas.
   *
   * BMI gets CDC's weight-status categories, which is what the client asked for — a parent
   * should be able to see where the child sits without decoding a percentile. Height and
   * weight get the one distinction that means anything for them: inside or outside P3-P97.
   */
  type Zone =
    | 'zUnder' | 'zHealthy' | 'zOver' | 'zObese' | 'zSevere'
    | 'zLow' | 'zTypical' | 'zHigh';

  // Every point carries every zone key, most of them undefined. A union of two shapes reads
  // more honestly but recharts types `dataKey` against the element type, so a key that exists
  // on only one branch is rejected — and a chart is either one kind or the other anyway.
  type BandedPoint = ReferenceCurvePoint & Partial<Record<Zone, [number, number]>>;

  const banded: BandedPoint[] = visibleCurve.map((p) => {
    const [lo, hi] = domain;
    if (
      hasObesityBands &&
      p.p5 !== undefined && p.p85 !== undefined &&
      p.p95 !== undefined && p.p120ofP95 !== undefined
    ) {
      return {
        ...p,
        zUnder: [lo, p.p5],
        zHealthy: [p.p5, p.p85],
        zOver: [p.p85, p.p95],
        zObese: [p.p95, p.p120ofP95],
        zSevere: [p.p120ofP95, hi],
      };
    }
    return {
      ...p,
      zLow: [lo, p.p3],
      zTypical: [p.p3, p.p97],
      zHigh: [p.p97, hi],
    };
  });

  const legendItems = [
    { label: title, color: seriesColor, dashed: false },
    { label: 'P3', color: c.band, dashed: true },
    { label: 'P50 (median)', color: c.median, dashed: true },
    ...(hasObesityBands
      ? [
          { label: 'P95 (obesity)', color: c.band, dashed: true },
          { label: '120% of P95 (severe)', color: c.band, dashed: true },
        ]
      : [{ label: 'P97', color: c.band, dashed: true }]),
  ];

  const zoneKeys: readonly (readonly [Zone, string, string])[] = hasObesityBands
    ? ([
        ['zUnder', fills.low, 'Underweight'],
        ['zHealthy', fills.healthy, 'Healthy weight'],
        ['zOver', fills.raised, 'Overweight'],
        ['zObese', fills.high, 'Obesity'],
        ['zSevere', fills.severe, 'Severe obesity'],
      ] as const)
    : ([
        // Low and high get different colours too. One amber for both told the reader they were
        // outside the band without telling them which way.
        ['zLow', fills.low, 'Below P3'],
        ['zTypical', fills.healthy, 'Typical range'],
        ['zHigh', fills.high, 'Above P97'],
      ] as const);

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <h2 className="font-semibold text-ink mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">
        {hasObesityBands
          ? "Dashed lines are the 3rd and 50th percentile, the 95th (obesity) and 120% of the 95th (severe obesity), for the child's age and sex. Percentiles above the 95th use CDC's 2022 extended method."
          : "Dashed lines are the 3rd/50th/97th percentile reference curves for the child's age and sex."}
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis
            dataKey="ageMonths"
            type="number"
            domain={[from, to]}
            allowDataOverflow
            tickFormatter={(m) => `${(m / 12).toFixed(0)}y`}
            fontSize={12}
            stroke={c.tick}
            tick={{ fill: c.tick }}
          />
          <YAxis
            dataKey="value"
            domain={domain}
            allowDataOverflow
            unit={unit}
            fontSize={12}
            stroke={c.tick}
            tick={{ fill: c.tick }}
          />
          {/* Painted before every line so the child's own series stays legible on top. */}
          {zoneKeys.map(([key, fill]) => (
            <Area
              key={key}
              data={banded}
              dataKey={key}
              fill={fill}
              stroke="none"
              isAnimationActive={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
          ))}

          <Tooltip content={<ReferenceTooltip unit={unit} title={title} curve={visibleCurve} />} />
          <Legend content={<ChartLegend items={legendItems} />} />
          {hasObesityBands ? (
            <>
              <Line data={visibleCurve} dataKey="p120ofP95" stroke={c.band} strokeDasharray="4 3" dot={false} name="120% of P95 (severe)" isAnimationActive={false} />
              <Line data={visibleCurve} dataKey="p95" stroke={c.band} strokeDasharray="4 3" dot={false} name="P95 (obesity)" isAnimationActive={false} />
            </>
          ) : (
            <Line data={visibleCurve} dataKey="p97" stroke={c.band} strokeDasharray="4 3" dot={false} name="P97" isAnimationActive={false} />
          )}
          <Line data={visibleCurve} dataKey="p50" stroke={c.median} strokeDasharray="4 3" dot={false} name="P50 (median)" isAnimationActive={false} />
          <Line data={visibleCurve} dataKey="p3" stroke={c.band} strokeDasharray="4 3" dot={false} name="P3" isAnimationActive={false} />
          <Line
            data={actual}
            dataKey="value"
            stroke={seriesColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            name={title}
            connectNulls
           
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* The shaded zones need naming. Colour on its own cannot carry the meaning — a reader
          who cannot distinguish the tints, or is looking at a printout, still has to be able
          to tell which band is which (WCAG 1.4.1). */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
        {zoneKeys.map(([key, fill, label]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-black/10 dark:border-white/15"
              style={{ backgroundColor: fill }}
            />
            {label}
          </li>
        ))}
      </ul>

      {footnote && <p className="text-xs text-gray-500 mt-2">{footnote}</p>}
    </div>
  );
}
