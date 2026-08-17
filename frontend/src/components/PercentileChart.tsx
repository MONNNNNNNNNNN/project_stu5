import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useThemeMode } from '../context/ThemeModeContext';
import { ageWindow, chartPalette, type Measure } from '../lib/chartTheme';
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

  let status: string | null = null;
  if (actual !== undefined && ref) {
    if (actual < ref.p3) status = `Below the typical reference range (P3: ${fmt(ref.p3)}${unit})`;
    else if (actual > ref.p97) status = `Above the typical reference range (P97: ${fmt(ref.p97)}${unit})`;
    else status = `Within the typical reference range (P3–P97: ${fmt(ref.p3)}–${fmt(ref.p97)}${unit})`;
  }

  const outside = actual !== undefined && ref !== null && (actual < ref.p3 || actual > ref.p97);

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
  const legendItems = [
    { label: title, color: seriesColor, dashed: false },
    { label: 'P3', color: c.band, dashed: true },
    { label: 'P50 (median)', color: c.median, dashed: true },
    { label: 'P97', color: c.band, dashed: true },
  ];

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <h2 className="font-semibold text-ink mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">
        Dashed lines are the 3rd/50th/97th percentile reference curves for the child's age and sex.
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
            domain={['auto', 'auto']}
            unit={unit}
            fontSize={12}
            stroke={c.tick}
            tick={{ fill: c.tick }}
          />
          <Tooltip content={<ReferenceTooltip unit={unit} title={title} curve={visibleCurve} />} />
          <Legend content={<ChartLegend items={legendItems} />} />
          <Line data={visibleCurve} dataKey="p97" stroke={c.band} strokeDasharray="4 3" dot={false} name="P97" isAnimationActive={false} />
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
      {footnote && <p className="text-xs text-gray-500 mt-2">{footnote}</p>}
    </div>
  );
}
