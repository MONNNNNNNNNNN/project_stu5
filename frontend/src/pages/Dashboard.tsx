import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import type { Article, GrowthChartPoint, GrowthStatistics, PubertyScreening } from '../types';

interface PubertyScreeningWithResult extends PubertyScreening {
  result: { summary: string; flagged: boolean };
}

function fmt(n: number | string | null | undefined, unit: string) {
  if (n === null || n === undefined) return '—';
  const val = typeof n === 'string' ? Number(n) : n;
  return `${val}${unit}`;
}

export default function Dashboard() {
  const { selectedChild, selectedChildId } = useChildren();

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

  const { data: articles } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => (await api.get<Article[]>('/articles')).data,
  });

  const latestScreening = pubertyHistory?.[0];

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

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-brand-500 text-white p-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Good morning{selectedChild ? `, ${selectedChild.nickname || selectedChild.fullName}` : ''}</h1>
          <p className="text-brand-50 text-sm opacity-90">Here's the latest growth snapshot.</p>
        </div>
        <Button component={Link} to="/growth/add" variant="contained" sx={{ bgcolor: 'white', color: '#396f63', '&:hover': { bgcolor: '#f2f5f1' } }}>
          + Log New Measurement
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="HEIGHT"
          value={fmt(stats?.latest?.heightCm, ' cm')}
          delta={stats?.heightDeltaCm ? `+${stats.heightDeltaCm}cm` : null}
          sub={stats?.latest?.heightPercentile ? `P${Math.round(Number(stats.latest.heightPercentile))}` : undefined}
        />
        <StatCard
          label="WEIGHT"
          value={fmt(stats?.latest?.weightKg, ' kg')}
          delta={stats?.weightDeltaKg ? `+${stats.weightDeltaKg}kg` : null}
          sub={stats?.latest?.weightPercentile ? `P${Math.round(Number(stats.latest.weightPercentile))}` : undefined}
        />
        <StatCard
          label="BMI"
          value={fmt(stats?.latest?.bmi, '')}
          delta={null}
          sub={stats?.latest?.guidance?.nutritionalStatus ?? undefined}
        />
        <StatCard label="RECORDS" value={String(chart?.length ?? 0)} delta={null} />
      </div>

      {stats?.latest?.guidance?.flagged && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          {stats.latest.guidance.message}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">Growth Trajectory</h2>
            <Link to="/growth" className="text-sm text-brand-600">Details →</Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e9df" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short' })} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
              <Line type="monotone" dataKey="heightCm" stroke="#46897a" strokeWidth={2} dot={{ r: 3 }} name="Height (cm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">Puberty Screening</h2>
          </div>
          {latestScreening ? (
            <p className="text-sm text-gray-600">{latestScreening.result.summary}</p>
          ) : (
            <p className="text-sm text-gray-500">No screening yet.</p>
          )}
          <Button component={Link} to="/puberty" variant="outlined" size="small" fullWidth sx={{ mt: 2 }}>
            Continue Screening
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <UploadFileIcon fontSize="small" className="text-brand-600" />
          <h2 className="font-semibold text-ink">AI Bone Age Analysis</h2>
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">BETA</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Upload a left-hand X-ray for a preliminary bone age assessment.
        </p>
        <Button component={Link} to="/bone-age" variant="outlined" size="small">
          Upload X-Ray
        </Button>
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
              className="bg-surface rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-24 bg-sage-100" />
              <div className="p-4">
                <span className="text-[10px] font-semibold uppercase text-brand-600">{article.tag}</span>
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
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: string | null;
  sub?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 border-l-4 border-brand-400">
      <p className="text-[10px] font-semibold text-gray-400 tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      {delta && <p className="text-xs text-brand-600 mt-1">↑ {delta} since last</p>}
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
