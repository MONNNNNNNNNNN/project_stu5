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
import { PercentileChart } from '../components/PercentileChart';
import { ArticleCard } from '../components/ArticleCard';
import type {
  Article,
  BoneAgePrediction,
  GrowthChartPoint,
  GrowthGuidance,
  GrowthStatistics,
  PubertyScreening,
  ReferenceCurvePoint,
  Suggestion,
} from '../types';

interface PubertyScreeningWithResult extends PubertyScreening {
  result: { title: string; summary: string; flagged: boolean };
}

function fmt(n: number | string | null | undefined, unit: string) {
  if (n === null || n === undefined) return '—';
  const val = typeof n === 'string' ? Number(n) : n;
  return `${val}${unit}`;
}

type Measure = 'height' | 'weight' | 'bmi';

/** Everything that varies between the three chart tabs, in one place. */
const MEASURES: {
  key: Measure;
  label: string;
  icon: ReactNode;
  title: string;
  unit: string;
  point: 'heightCm' | 'weightKg' | 'bmi';
  percentile: 'heightPercentile' | 'weightPercentile' | 'bmiPercentile';
}[] = [
  {
    key: 'height',
    label: 'Height',
    icon: <HeightIcon fontSize="small" />,
    title: 'Height-for-age',
    unit: 'cm',
    point: 'heightCm',
    percentile: 'heightPercentile',
  },
  {
    key: 'weight',
    label: 'Weight',
    icon: <MonitorWeightIcon fontSize="small" />,
    title: 'Weight-for-age',
    unit: 'kg',
    point: 'weightKg',
    percentile: 'weightPercentile',
  },
  {
    key: 'bmi',
    label: 'BMI',
    icon: <AccessibilityNewIcon fontSize="small" />,
    title: 'BMI-for-age',
    unit: '',
    point: 'bmi',
    percentile: 'bmiPercentile',
  },
];

const AMBER = 'text-amber-700 dark:text-amber-400';
const RED = 'text-red-700 dark:text-red-400';

function describePercentile(p: number | null) {
  if (p === null) return null;
  // Above the 99th, rounding to a whole percentile stops carrying information: a BMI of 35
  // and a BMI of 60 in a ten-year-old are the 99.97th and 100th, and both render as "P100".
  // Say ">P99" and let the BMI tile below carry the actual severity.
  if (p >= 99.5) return { label: '>P99 · well above typical', tone: AMBER };
  if (p < 3) return { label: `P${Math.round(p)} · below typical`, tone: AMBER };
  if (p > 97) return { label: `P${Math.round(p)} · above typical`, tone: AMBER };
  return { label: `P${Math.round(p)} · typical range`, tone: 'text-brand-600' };
}

/**
 * What the BMI tile says.
 *
 * Percentile alone is the wrong summary once a child is obese — it saturates. The weight
 * status and the percent-of-P95 are the only things that still distinguish one severely obese
 * child from another, so they take over the line when the status warrants it.
 */
function describeBmi(percentile: number | null, guidance?: GrowthGuidance) {
  const key = guidance?.nutritionalStatusKey;
  if (key === 'SEVERE_OBESITY' || key === 'OBESITY' || key === 'UNDERWEIGHT') {
    const pct = guidance?.bmiPctOfP95;
    return {
      label:
        key === 'UNDERWEIGHT'
          ? guidance!.nutritionalStatus!
          : `${guidance!.nutritionalStatus}${pct ? ` · ${Math.round(pct)}% of P95` : ''}`,
      tone: key === 'SEVERE_OBESITY' ? RED : AMBER,
    };
  }
  return describePercentile(percentile);
}

/**
 * What to do next, from reading all three features together.
 *
 * This is the answer to the client's "the menus aren't related" — a bone age means little
 * without the growth chart and the screening beside it. Suggestions, never blocks: a medical
 * questionnaire a parent cannot skip is a reason to close the app.
 */
function NextSteps({ items }: { items: Suggestion[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <h2 className="font-semibold text-ink">What to do next</h2>
      {items.map((s) => (
        <div
          key={s.kind}
          className={`rounded-xl border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
            s.severity === 'warning'
              ? 'border-amber-300 bg-amber-50/60 dark:bg-transparent'
              : 'border-brand-100'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-ink">{s.title}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.body}</p>
          </div>
          <Button
            component={Link}
            to={s.actionHref}
            size="small"
            variant={s.severity === 'warning' ? 'contained' : 'outlined'}
            color={s.severity === 'warning' ? 'warning' : 'primary'}
            className="shrink-0"
          >
            {s.actionLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { selectedChild, selectedChildId } = useChildren();
  const [measure, setMeasure] = useState<Measure>('height');

  const { data: stats } = useQuery({
    queryKey: ['growth-statistics', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthStatistics>('/growth/statistics', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['suggestions', selectedChildId],
    queryFn: async () =>
      (await api.get<Suggestion[]>('/suggestions', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: chart } = useQuery({
    queryKey: ['growth-chart', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthChartPoint[]>('/growth/chart', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: curve } = useQuery({
    queryKey: ['growth-reference-curve', selectedChildId, measure],
    queryFn: async () =>
      (
        await api.get<ReferenceCurvePoint[]>('/growth/reference-curve', {
          params: { childId: selectedChildId, measure },
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

  const active = MEASURES.find((m) => m.key === measure)!;
  const points = (chart ?? []).map((c) => ({
    ageMonths: selectedChild ? ageInMonths(selectedChild.dateOfBirth, c.date) : 0,
    value: c[active.point],
  }));

  return (
    <div className="flex flex-col gap-6">
      {selectedChild && <ChildProfileCard child={selectedChild} />}

      {stats?.latest?.guidance?.flagged && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          {stats.latest.guidance.message}
        </div>
      )}

      <NextSteps items={suggestions ?? []} />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink">Growth Trajectory</h2>
            <Button component={Link} to="/growth" size="small" startIcon={<AddIcon fontSize="small" />} variant="outlined">
              Add Measurement
            </Button>
          </div>

          {/* The three measures used to be separate stat cards above the chart that each
              opened their own dialog. As tabs they stay just as glanceable — the current
              value is still on the face of each — but selecting one now swaps the chart
              below instead of covering it with a modal. */}
          <div className="grid grid-cols-3 gap-2 mb-4" role="tablist" aria-label="Growth measure">
            {MEASURES.map((m) => {
              const isActive = m.key === measure;
              const value =
                m.key === 'height'
                  ? fmt(stats?.latest?.heightCm, ' cm')
                  : m.key === 'weight'
                    ? fmt(stats?.latest?.weightKg, ' kg')
                    : fmt(stats?.latest?.bmi, '');
              const raw = stats?.latest?.[m.percentile];
              const percentile = raw !== null && raw !== undefined ? Number(raw) : null;
              const status =
                m.key === 'bmi'
                  ? describeBmi(percentile, stats?.latest?.guidance)
                  : describePercentile(percentile);
              return (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setMeasure(m.key)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    isActive
                      ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
                      : 'border-brand-100 hover:border-brand-300 hover:-translate-y-0.5'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-gray-500 tracking-wide flex items-center gap-1 uppercase">
                    {m.icon}
                    {m.label}
                  </span>
                  <span className="block text-lg sm:text-xl font-semibold text-ink mt-0.5 tabular-nums whitespace-nowrap">
                    {value}
                  </span>
                  {status && <span className={`block text-[11px] mt-0.5 ${status.tone}`}>{status.label}</span>}
                </button>
              );
            })}
          </div>

          {stats?.latest?.guidance && (
            <p className={`text-xs mb-2 ${stats.latest.guidance.flagged ? 'text-amber-700' : 'text-brand-600'}`}>
              {stats.latest.guidance.message}
              {measure === 'bmi' && stats.latest.guidance.nutritionalStatus && (
                <> Nutritional status: <span className="font-semibold">{stats.latest.guidance.nutritionalStatus}</span>.</>
              )}
            </p>
          )}
          <PercentileChart
            title={`${active.title} vs. Reference`}
            unit={active.unit}
            curve={curve ?? []}
            points={points}
            measure={active.key}
          />
        </div>

        {/* self-start so the card sizes to its content. As a grid item it stretched to
            match the chart beside it, leaving a tall empty gap above the button. */}
        <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col self-start">
          <div className="flex items-center gap-2 mb-2">
            <PsychologyIcon fontSize="small" className="text-brand-600" />
            <h2 className="font-semibold text-ink">Puberty Screening</h2>
          </div>
          {latestScreening ? (
            <>
              <p
                className={`text-sm font-medium ${
                  latestScreening.result.flagged ? 'text-amber-700 dark:text-amber-400' : 'text-brand-600'
                }`}
              >
                {latestScreening.result.title}
              </p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-3">{latestScreening.result.summary}</p>
              <Button component={Link} to="/puberty" variant="outlined" size="small" fullWidth sx={{ mt: 2 }}>
                {latestScreening.result.flagged ? 'View result and plan' : 'View result'}
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

      <div className="bg-surface rounded-2xl shadow-sm p-5">
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
            <ArticleCard key={article.id} article={article} height="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
