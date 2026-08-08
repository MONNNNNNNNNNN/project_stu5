import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MonitoringIcon from '@mui/icons-material/InsightsOutlined';
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { api } from '../lib/api';
import type { Article } from '../types';

function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-cream rounded-xl border border-brand-100 p-3 ${compact ? 'text-[7px]' : 'text-[10px]'} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="font-heading font-bold text-brand-500">GrowTH</span>
        <div className="w-4 h-4 rounded-full bg-brand-200" />
      </div>
      <div className="bg-surface rounded-lg border border-brand-100 p-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-brand-200 shrink-0" />
        <div className="flex-1">
          <div className="h-1.5 w-16 bg-ink/70 rounded mb-1" />
          <div className="h-1 w-10 bg-gray-300 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['Height', 'Weight', 'BMI'].map((l) => (
          <div key={l} className="bg-surface rounded-lg border-l-2 border-brand-500 border border-brand-100 p-1.5">
            <div className="h-1 w-6 bg-gray-300 rounded mb-1" />
            <div className="h-2 w-8 bg-ink/70 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-lg border border-brand-100 p-2 flex-1">
        <div className="h-1.5 w-20 bg-ink/70 rounded mb-2" />
        <div className="h-10 rounded-md bg-gradient-to-t from-brand-100 to-transparent flex items-end">
          <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
            <polyline points="0,28 20,22 40,18 60,14 80,10 100,4" fill="none" stroke="var(--color-brand-500)" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { data: articles } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => (await api.get<Article[]>('/articles')).data,
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="relative py-20 px-4 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 to-cream -z-10" />
        <img src="/logo.png" alt="GrowTH" className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-xl mb-6 bg-white rounded-3xl p-3 ring-1 ring-brand-100" />
        <h1 className="font-heading font-extrabold text-3xl md:text-5xl tracking-tight bg-gradient-to-r from-brand-500 to-sage-500 bg-clip-text text-transparent max-w-3xl">
          Nurture Every Milestone
        </h1>
        <p className="text-gray-500 text-base md:text-lg max-w-2xl mt-4">
          GrowTH is the intelligent companion for parents, providing actionable insights and calm tracking for
          your child's developmental journey.
        </p>
        <div className="flex gap-3 mt-8">
          <Button variant="contained" size="large" onClick={() => navigate('/login')} sx={{ borderRadius: 999, px: 4 }}>
            Start Tracking
          </Button>
          <Button variant="outlined" size="large" onClick={() => navigate('/about')} sx={{ borderRadius: 999, px: 4 }}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Desktop dashboard preview */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-ink mb-2">Comprehensive Dashboard</h2>
          <p className="text-gray-500">Monitor growth metrics with professional precision on any device.</p>
        </div>
        <div className="max-w-4xl mx-auto rounded-2xl border border-brand-100 shadow-xl overflow-hidden bg-gray-100 dark:bg-gray-100 p-4 md:p-8">
          <div className="rounded-lg overflow-hidden border border-brand-100 bg-cream">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-surface border-b border-brand-100">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
            </div>
            <div className="p-4">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* About / mobile preview */}
      <section className="py-16 px-4" id="about">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="flex justify-center order-2 md:order-1">
            <div className="w-48 rounded-[2rem] border-4 border-ink/10 shadow-xl overflow-hidden bg-cream p-2">
              <DashboardPreview compact />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <span className="font-mono text-xs tracking-widest text-brand-500 uppercase font-semibold">About GrowTH</span>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-ink mt-2 mb-3">For Parents Who Care</h2>
            <p className="text-gray-500 mb-6">
              Designed specifically for proactive parents, GrowTH translates complex developmental data into
              simple, actionable insights. We believe in providing clarity over clutter, so you can focus on
              what matters most — your child's well-being.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface p-4 rounded-xl border border-brand-100">
                <MonitoringIcon className="text-brand-500 mb-2" />
                <h3 className="font-semibold text-sm text-ink mb-1">Track Progress</h3>
                <p className="text-xs text-gray-500">Log milestones and physical growth with ease.</p>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-brand-100">
                <PsychologyIcon className="text-sage-500 mb-2" />
                <h3 className="font-semibold text-sm text-ink mb-1">AI-Assisted</h3>
                <p className="text-xs text-gray-500">Bone age screening support, in one place.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo video */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-3xl mx-auto">
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-brand-700 to-sage-600 flex items-center justify-center relative shadow-lg">
            <button className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform" aria-label="Play promo video">
              <PlayArrowIcon fontSize="large" className="text-brand-600 ml-1" />
            </button>
            <span className="absolute bottom-4 text-white/70 text-xs">Promo video — coming soon</span>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-ink mb-2">Nurturing Knowledge</h2>
          <p className="text-gray-500 mb-8">Expert articles to guide you through every stage.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(articles ?? []).slice(0, 3).map((article) => (
              <Link
                key={article.id}
                to={`/learn/${article.id}`}
                className="bg-surface rounded-2xl border border-brand-100 overflow-hidden hover:border-brand-400 transition-colors shadow-sm block p-4"
              >
                <span className="text-xs font-mono uppercase tracking-widest text-sage-500 font-semibold">{article.tag}</span>
                <h3 className="font-semibold text-ink mt-1 mb-1">{article.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{article.summary}</p>
              </Link>
            ))}
            {(articles ?? []).length === 0 && (
              <p className="text-sm text-gray-500 col-span-3">Articles coming soon.</p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
