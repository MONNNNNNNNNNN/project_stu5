import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, Chip } from '@mui/material';
import { api } from '../lib/api';
import { ageInMonths } from '../lib/age';
import { useChildren } from '../context/ChildContext';
import { PercentileChart } from './PercentileChart';
import type { GrowthChartPoint, ReferenceCurvePoint } from '../types';

type Measure = 'height' | 'weight' | 'bmi';

interface Props {
  open: boolean;
  onClose: () => void;
  measure: Measure;
  title: string;
  unit: string;
  color: string;
  percentile: number | null;
}

function describePercentile(p: number | null) {
  if (p === null) return { label: 'Not enough data yet', severity: 'default' as const };
  if (p < 3) return { label: 'Below typical range', severity: 'warning' as const };
  if (p > 97) return { label: 'Above typical range', severity: 'warning' as const };
  return { label: 'Within typical range', severity: 'success' as const };
}

const chartKey: Record<Measure, keyof GrowthChartPoint> = {
  height: 'heightCm',
  weight: 'weightKg',
  bmi: 'bmi',
};

export function StatDetailDialog({ open, onClose, measure, title, unit, color, percentile }: Props) {
  const { selectedChildId, selectedChild } = useChildren();

  const { data: chart } = useQuery({
    queryKey: ['growth-chart', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthChartPoint[]>('/growth/chart', { params: { childId: selectedChildId } })).data,
    enabled: open && !!selectedChildId,
  });

  const { data: curve } = useQuery({
    queryKey: ['growth-reference-curve', selectedChildId, measure],
    queryFn: async () =>
      (
        await api.get<ReferenceCurvePoint[]>('/growth/reference-curve', {
          params: { childId: selectedChildId, measure },
        })
      ).data,
    enabled: open && !!selectedChildId,
  });

  const status = describePercentile(percentile);
  const key = chartKey[measure];
  const points = (chart ?? []).map((c) => ({
    ageMonths: selectedChild ? ageInMonths(selectedChild.dateOfBirth, c.date) : 0,
    value: c[key] as number | null,
  }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-heading flex items-center justify-between gap-3">
        <span>{title} — Graph Summary</span>
        <Chip
          label={percentile !== null ? `${status.label} (P${Math.round(percentile)})` : status.label}
          color={status.severity}
          size="small"
        />
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <PercentileChart title={title} unit={unit} curve={curve ?? []} points={points} color={color} />
      </DialogContent>
    </Dialog>
  );
}
