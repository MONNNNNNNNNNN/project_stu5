import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@mui/material';
import HeightIcon from '@mui/icons-material/Height';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeightOutlined';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNewOutlined';
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesOutlined';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../lib/api';
import { ageInMonths } from '../lib/age';
import { useChildren } from '../context/ChildContext';
import { ChildProfileCard } from '../components/ChildProfileCard';
import { StatDetailDialog } from '../components/StatDetailDialog';
import { PercentileChart } from '../components/PercentileChart';
import type {
  Article,
  BoneAgePrediction,
  GrowthChartPoint,
  GrowthStatistics,
  PubertyScreening,
  ReferenceCurvePoint,
} from '../types';

interface PubertyScreeningWithResult extends PubertyScreening {
  result: { summary: string; flagged: boolean };
}

function fmt(n: number | string | null | undefined, unit: string) {
  if (n === null || n === undefined) return '—';
  const val = typeof n === 'string' ? Number(n) : n;
  return `${val}${unit}`;
}

type Measure = 'height' | 'weight' | 'bmi';

export default function Dashboard() {
  const { selectedChild, selectedChildId } = useChildren();
  const [statDialog, setStatDialog] = useState<Measure | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['growth-statistics', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthStatistics>('/growth/statistics', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: chart } = useQuery({
    queryKey: ['growth-chart', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthChartPoint[]>('/growth/chart', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: heightCurve } = useQuery({
    queryKey: ['growth-reference-curve', selectedChildId, 'height'],
    queryFn: async () =>
      (
        await api.get<ReferenceCurvePoint[]>('/growth/reference-curve', {
          params: { childId: selectedChildId, measure: 'height' },
        })
      ).data,
    enabled: !!selectedChildId,
  });

  const { data: pubertyHistory } = useQuery({
    queryKey: ['puberty-history', selectedChildId],
    queryFn: async () =>
      (
        await api.get<PubertyScreeningWithResult[]>('/puberty/history', {
          params: { childId: selectedChildId },
        })
      ).data,
    enabled: !!selectedChildId,
  });

  const { data: boneAgeHistory } = useQuery({
    queryKey: ['bone-age-history', selectedChildId],
    queryFn: async () =>
      (await api.get<BoneAgePrediction[]>('/bone-age/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: articles } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => (await api.get<Article[]>('/articles')).data,
  });

  const latestScreening = pubertyHistory?.[0];
  const latestBoneAge = boneAgeHistory?.[0];

  if (!selectedChildId) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Add a child to start tracking growth.</p>
        <Button component={Link} to="/children/new" variant="contained">
          Add child
        </Button>
      </div>
    );
  }

  const heightPoints = (chart ?? []).map((c) => ({
    ageMonths: selectedChild ? ageInMonths(selectedChild.dateOfBirth, c.date) : 0,
    value: c.heightCm,
  }));

  return (
    <div className="flex flex-col gap-6">
      {selectedChild && <ChildProfileCard child={selectedChild} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<HeightIcon fontSize="small" />}
          label="HEIGHT"
          value={fmt(stats?.latest?.heightCm, ' cm')}
          delta={stats?.heightDeltaCm ? `+${stats.heightDeltaCm}cm` : null}
          sub={stats?.latest?.heightPercentile ? `P${Math.round(Number(stats.latest.heightPercentile))}` : undefined}
          onClick={() => setStatDialog('height')}
        />
        <StatCard
          icon={<MonitorWeightIcon fontSize="small" />}
          label="WEIGHT"
          value={fmt(stats?.latest?.weightKg, ' kg')}
          delta={stats?.weightDeltaKg ? `+${stats.weightDeltaKg}kg` : null}
          sub={stats?.latest?.weightPercentile ? `P${Math.round(Number(stats.latest.weightPercentile))}` : undefined}
          onClick={() => setStatDialog('weight')}
        />
        <StatCard
          icon={<AccessibilityNewIcon fontSize="small" />}
          label="BMI"
          value={fmt(stats?.latest?.bmi, '')}
          delta={null}
          sub={stats?.latest?.guidance?.nutritionalStatus ?? undefined}
          onClick={() => setStatDialog('bmi')}
        />
        <StatCard label="RECORDS" value={String(chart?.length ?? 0)} delta={null} />
      </div>

      {stats?.latest?.guidance?.flagged && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          {stats.latest.guidance.message}
        </div>
      )}

      {statDialog && (
        <StatDetailDialog
          open={!!statDialog}
          onClose={() => setStatDialog(null)}
          measure={statDialog}
          title={statDialog === 'height' ? 'Height-for-age' : statDialog === 'weight' ? 'Weight-for-age' : 'BMI-for-age'}
          unit={statDialog === 'height' ? 'cm' : statDialog === 'weight' ? 'kg' : ''}
          color={statDialog === 'height' ? '#46897a' : statDialog === 'weight' ? '#87a480' : '#c98a3f'}
          percentile={
            statDialog === 'height'
              ? stats?.latest?.heightPercentile
                ? Number(stats.latest.heightPercentile)
                : null
              : statDialog === 'weight'
                ? stats?.latest?.weightPercentile
                  ? Number(stats.latest.weightPercentile)
                  : null
                : stats?.latest?.bmiPercentile
                  ? Number(stats.latest.bmiPercentile)
                  : null
          }
        />
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface rounded-2xl shadow-sm p-5 border-t-4 border-brand-400">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-ink">Growth Trajectory</h2>
            <Button component={Link} to="/growth" size="small" startIcon={<AddIcon fontSize="small" />} variant="outlined">
              Add Measurement
            </Button>
          </div>
          {stats?.latest?.guidance && (
            <p className={`text-xs mb-2 ${stats.latest.guidance.flagged ? 'text-amber-700' : 'text-brand-600'}`}>
              {stats.latest.guidance.message}
            </p>
          )}
          <PercentileChart title="Height vs. Reference" unit="cm" curve={heightCurve ?? []} points={heightPoints} color="#46897a" />
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5 border-t-4 border-brand-400 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <PsychologyIcon fontSize="small" className="text-brand-600" />
            <h2 className="font-semibold text-ink">Puberty Screening</h2>
          </div>
          {latestScreening ? (
            <>
              <p className="text-sm text-gray-600 flex-1">{latestScreening.result.summary}</p>
              <Button component={Link} to="/puberty" variant="outlined" size="small" fullWidth sx={{ mt: 2 }}>
                Continue Screening
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 flex-1">
                Answer a short questionnaire to screen for early signs of puberty.
              </p>
              <Button component={Link} to="/puberty" variant="contained" size="small" fullWidth sx={{ mt: 2 }}>
                Start Screening
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5 border-t-4 border-brand-400">
        <div className="flex items-center gap-2 mb-2">
          <MedicalServicesIcon fontSize="small" className="text-brand-600" />
          <h2 className="font-semibold text-ink">AI Bone Age Analysis</h2>
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">BETA</span>
        </div>
        {latestBoneAge ? (
          <>
            <p className="text-sm text-gray-500 mb-3">
              {latestBoneAge.status === 'COMPLETED' && latestBoneAge.predictedAgeMonths
                ? `Latest estimate: ${(latestBoneAge.predictedAgeMonths / 12).toFixed(1)} years bone age.`
                : latestBoneAge.status === 'PENDING'
                  ? 'Your last X-ray is still being analyzed.'
                  : 'Your last analysis could not be completed — try uploading again.'}
            </p>
            <Button component={Link} to="/bone-age" variant="outlined" size="small" startIcon={<AddIcon fontSize="small" />}>
              Add New X-Ray
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
              Upload a left-hand X-ray for a preliminary bone age assessment.
            </p>
            <Button component={Link} to="/bone-age" variant="outlined" size="small" startIcon={<AddIcon fontSize="small" />}>
              Upload X-Ray
            </Button>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-ink">Parenting Resources</h2>
          <Link to="/learn" className="text-sm text-brand-600">View all</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(articles ?? []).slice(0, 3).map((article) => (
            <Link
              key={article.id}
              to={`/learn/${article.id}`}
              className="bg-surface rounded-2xl shadow-sm overflow-hidden border border-transparent hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="h-24 bg-sage-100" />
              <div className="p-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                  {article.tag}
                </span>
                <h3 className="font-medium text-sm mt-1 text-ink">{article.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  sub,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  delta: string | null;
  sub?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`bg-surface rounded-2xl shadow-sm p-4 border-l-4 border-brand-400 text-left w-full ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''
      }`}
    >
      <p className="text-[10px] font-semibold text-gray-400 tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      {delta && <p className="text-xs text-brand-600 mt-1">↑ {delta} since last</p>}
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </Comp>
  );
}
