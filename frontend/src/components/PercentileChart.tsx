import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { ReferenceCurvePoint } from '../types';

interface Props {
  title: string;
  unit: string;
  curve: ReferenceCurvePoint[];
  points: { ageMonths: number; value: number | null }[];
  color: string;
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
          <Tooltip
            labelFormatter={(m) => `Age: ${(Number(m) / 12).toFixed(1)} years`}
            formatter={(v) => `${v}${unit}`}
          />
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
