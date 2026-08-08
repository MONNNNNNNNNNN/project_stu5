import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { ReferenceCurvePoint } from '../types';

interface Props {
  title: string;
  unit: string;
  curve: ReferenceCurvePoint[];
  points: { ageMonths: number; value: number | null }[];
  color: string;
}

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
    if (actual < ref.p3) status = `Below the typical reference range (P3: ${ref.p3}${unit})`;
    else if (actual > ref.p97) status = `Above the typical reference range (P97: ${ref.p97}${unit})`;
    else status = `Within the typical reference range (P3–P97: ${ref.p3}–${ref.p97}${unit})`;
  }

  return (
    <div className="bg-surface border border-brand-100 rounded-xl shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-ink mb-1">Age: {(ageMonths / 12).toFixed(1)} years</p>
      {actual !== undefined && (
        <p className="text-ink">
          {title}: <span className="font-semibold">{actual}{unit}</span>
        </p>
      )}
      {ref && <p className="text-gray-500">Reference median (P50): {ref.p50}{unit}</p>}
      {status && <p className={actual !== undefined && (actual < ref!.p3 || actual > ref!.p97) ? 'text-amber-600 mt-1' : 'text-brand-600 mt-1'}>{status}</p>}
    </div>
  );
}

export function PercentileChart({ title, unit, curve, points, color }: Props) {
  const actual = points
    .filter((p) => p.value !== null)
    .map((p) => ({ ageMonths: p.ageMonths, value: p.value }));

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <h2 className="font-semibold text-ink mb-1">{title}</h2>
      <p className="text-xs text-gray-400 mb-4">
        Dashed lines are the 3rd/50th/97th percentile reference curves for the child's age and sex.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e9df" />
          <XAxis
            dataKey="ageMonths"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(m) => `${Math.round(m / 12)}y`}
            fontSize={12}
          />
          <YAxis dataKey="value" domain={['auto', 'auto']} unit={unit} fontSize={12} />
          <Tooltip content={<ReferenceTooltip unit={unit} title={title} curve={curve} />} />
          <Legend />
          <Line data={curve} dataKey="p97" stroke="#c7d5c2" strokeDasharray="4 3" dot={false} name="P97" isAnimationActive={false} />
          <Line data={curve} dataKey="p50" stroke="#a6bd9f" strokeDasharray="4 3" dot={false} name="P50 (median)" isAnimationActive={false} />
          <Line data={curve} dataKey="p3" stroke="#c7d5c2" strokeDasharray="4 3" dot={false} name="P3" isAnimationActive={false} />
          <Line
            data={actual}
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
            name={title}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
