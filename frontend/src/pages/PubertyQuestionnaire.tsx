import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, Alert, Checkbox, FormControlLabel, Chip } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import { ChildProfileCard } from '../components/ChildProfileCard';
import type { PubertyScreening } from '../types';

interface Answers {
  breastDevelopment?: boolean;
  breastDevelopmentAgeYears?: number;
  menstruation?: boolean;
  menstruationAgeYears?: number;
  testicularOrGenitalEnlargement?: boolean;
  testicularOrGenitalEnlargementAgeYears?: number;
  voiceDeepening?: boolean;
  pubicOrBodyHairGrowth?: boolean;
  pubicOrBodyHairGrowthAgeYears?: number;
  growthSpurt?: boolean;
  familyPubertyOnsetAgeYears?: number;
  behavioralMoodSkinChanges?: boolean;
  otherHealthNotes?: string;
}

interface ScreeningResult {
  summary: string;
  signsReported: string[];
  flagged: boolean;
  flagReason: string | null;
}

function SignQuestion({
  label,
  checked,
  onCheckedChange,
  ageValue,
  onAgeChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  ageValue?: number;
  onAgeChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border border-gray-100 rounded-xl p-3">
      <FormControlLabel
        sx={{ ml: 0 }}
        control={<Checkbox checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />}
        label={<span className="text-sm">{label}</span>}
      />
      {checked && (
        <TextField
          size="small"
          type="number"
          label="Approx. age (years)"
          value={ageValue ?? ''}
          onChange={(e) => onAgeChange(e.target.value ? Number(e.target.value) : undefined)}
          sx={{ width: 160 }}
        />
      )}
    </div>
  );
}

export default function PubertyQuestionnaire() {
  const { selectedChildId, selectedChild } = useChildren();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotes] = useState('');
  const [lastResult, setLastResult] = useState<ScreeningResult | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: history } = useQuery({
    queryKey: ['puberty-history', selectedChildId],
    queryFn: async () =>
      (
        await api.get<(PubertyScreening & { result: ScreeningResult })[]>('/puberty/history', {
          params: { childId: selectedChildId },
        })
      ).data,
    enabled: !!selectedChildId,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/puberty/questionnaire', {
          childId: selectedChildId,
          answers,
          notes: notes || undefined,
        })
      ).data as { result: ScreeningResult },
    onSuccess: async (data) => {
      setLastResult(data.result);
      setAnswers({});
      setNotes('');
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['puberty-history', selectedChildId] });
    },
  });

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  if (!selectedChildId || !selectedChild) {
    return <p className="text-gray-500">Select or add a child first.</p>;
  }

  const isFemale = selectedChild.sex === 'FEMALE';
  const latestScreening = history?.[0];
  const hasHistory = !!history && history.length > 0;
  const showForm = !hasHistory || formOpen;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <ChildProfileCard child={selectedChild} />
      <div>
        <h1 className="text-xl font-semibold text-brand-700">Puberty Screening</h1>
        <p className="text-sm text-gray-500 mt-1">
          A guided screening tool, not a clinical diagnosis. Talk to a pediatrician for a formal
          assessment.
        </p>
      </div>

      {lastResult && (
        <Alert severity={lastResult.flagged ? 'warning' : 'success'} onClose={() => setLastResult(null)}>
          {lastResult.summary} {lastResult.flagReason}
        </Alert>
      )}

      {hasHistory && !formOpen && latestScreening && (
        <div className="bg-surface rounded-2xl shadow-sm p-5 border-t-4 border-brand-400">
          <div className="flex items-center gap-2 mb-2">
            <PsychologyIcon fontSize="small" className="text-brand-600" />
            <h2 className="font-semibold text-ink">Latest screening</h2>
            <Chip
              label={latestScreening.result.flagged ? 'Flagged for review' : 'Within typical range'}
              color={latestScreening.result.flagged ? 'warning' : 'success'}
              size="small"
            />
          </div>
          <p className="text-xs text-gray-400 mb-2">
            {new Date(latestScreening.assessedAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600 mb-4">{latestScreening.result.summary}</p>
          <Button variant="contained" onClick={() => setFormOpen(true)}>
            Continue Screening
          </Button>
        </div>
      )}

      {showForm && (
      <>
      <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-ink">{isFemale ? 'For girls' : 'For boys'}</h2>
          {hasHistory && (
            <Button size="small" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          )}
        </div>

        {isFemale ? (
          <>
            <SignQuestion
              label="Has breast development (thelarche) been observed?"
              checked={!!answers.breastDevelopment}
              onCheckedChange={(v) => set('breastDevelopment', v)}
              ageValue={answers.breastDevelopmentAgeYears}
              onAgeChange={(v) => set('breastDevelopmentAgeYears', v)}
            />
            <SignQuestion
              label="Has menstruation begun?"
              checked={!!answers.menstruation}
              onCheckedChange={(v) => set('menstruation', v)}
              ageValue={answers.menstruationAgeYears}
              onAgeChange={(v) => set('menstruationAgeYears', v)}
            />
          </>
        ) : (
          <>
            <SignQuestion
              label="Has testicular or genital enlargement been observed?"
              checked={!!answers.testicularOrGenitalEnlargement}
              onCheckedChange={(v) => set('testicularOrGenitalEnlargement', v)}
              ageValue={answers.testicularOrGenitalEnlargementAgeYears}
              onAgeChange={(v) => set('testicularOrGenitalEnlargementAgeYears', v)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!answers.voiceDeepening}
                  onChange={(e) => set('voiceDeepening', e.target.checked)}
                />
              }
              label={<span className="text-sm">Has voice deepening been observed?</span>}
            />
          </>
        )}

        <SignQuestion
          label={isFemale ? 'Has pubic or underarm hair growth been observed?' : 'Has pubic, underarm, or facial hair growth been observed?'}
          checked={!!answers.pubicOrBodyHairGrowth}
          onCheckedChange={(v) => set('pubicOrBodyHairGrowth', v)}
          ageValue={answers.pubicOrBodyHairGrowthAgeYears}
          onAgeChange={(v) => set('pubicOrBodyHairGrowthAgeYears', v)}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={!!answers.growthSpurt}
              onChange={(e) => set('growthSpurt', e.target.checked)}
            />
          }
          label={<span className="text-sm">Has the child experienced a noticeable recent increase in height growth rate?</span>}
        />
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-ink mb-1">General</h2>
        <TextField
          size="small"
          type="number"
          label="At approx. what age did the child's parents or siblings begin puberty? (optional)"
          value={answers.familyPubertyOnsetAgeYears ?? ''}
          onChange={(e) => set('familyPubertyOnsetAgeYears', e.target.value ? Number(e.target.value) : undefined)}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!answers.behavioralMoodSkinChanges}
              onChange={(e) => set('behavioralMoodSkinChanges', e.target.checked)}
            />
          }
          label={<span className="text-sm">Any behavioral, mood, or skin changes (e.g., acne, body odor) associated with early development?</span>}
        />
        <TextField
          label="Other health conditions, medications, or relevant history (optional)"
          fullWidth
          multiline
          minRows={2}
          value={answers.otherHealthNotes ?? ''}
          onChange={(e) => set('otherHealthNotes', e.target.value)}
        />
        <TextField
          label="Additional notes (optional)"
          fullWidth
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button variant="contained" fullWidth disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Saving…' : 'Save screening'}
        </Button>
      </div>
      </>
      )}

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">History</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {(history ?? []).map((h) => (
            <div key={h.id} className="py-2 flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{new Date(h.assessedAt).toLocaleDateString()}</span>
                {h.result.flagged && <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">Flagged</span>}
              </div>
              <p className="text-xs text-gray-500">{h.result.summary}</p>
            </div>
          ))}
          {(history ?? []).length === 0 && <p className="text-sm text-gray-500 py-2">No screenings yet.</p>}
        </div>
      </div>
    </div>
  );
}
