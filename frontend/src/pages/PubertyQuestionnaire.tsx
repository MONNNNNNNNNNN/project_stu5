import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, Alert, Checkbox, FormControlLabel, Chip, Stepper, Step, StepLabel } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventRepeatIcon from '@mui/icons-material/EventRepeatOutlined';
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

type PubertyOutcome = 'NO_SIGNS_YET' | 'TYPICAL_ONSET' | 'EARLY_SIGNS' | 'DELAYED_ONSET';

interface ScreeningResult {
  outcome: PubertyOutcome;
  title: string;
  summary: string;
  signsReported: string[];
  flagged: boolean;
  flagReason: string | null;
  guidance: string[];
  seeDoctor: boolean;
}

interface MonitoringStep {
  round: number;
  completedAt: string | null;
  dueAt: string | null;
  outcome: PubertyOutcome | null;
}

interface MonitoringPlan {
  active: boolean;
  totalRounds: number;
  completedRounds: number;
  steps: MonitoringStep[];
  conclusion: { title: string; summary: string; guidance: string[] } | null;
}

type ScreeningWithResult = PubertyScreening & { result: ScreeningResult };

/** Which MUI severity each outcome maps to, so the colour always matches the message. */
const OUTCOME_SEVERITY: Record<PubertyOutcome, 'success' | 'info' | 'warning'> = {
  NO_SIGNS_YET: 'info',
  TYPICAL_ONSET: 'success',
  EARLY_SIGNS: 'warning',
  DELAYED_ONSET: 'warning',
};

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

function ResultCard({ result }: { result: ScreeningResult }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5 border-t-4 border-brand-400 flex flex-col gap-3">
      <Alert severity={OUTCOME_SEVERITY[result.outcome]}>
        <span className="font-semibold">{result.title}</span>
        <p className="text-sm mt-1">{result.summary}</p>
      </Alert>

      {result.signsReported.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.signsReported.map((s) => (
            <Chip key={s} label={s} size="small" variant="outlined" />
          ))}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm text-ink mb-2">What to do next</h3>
        <ul className="flex flex-col gap-2">
          {result.guidance.map((g) => (
            <li key={g} className="text-sm text-gray-600 flex gap-2">
              <span className="text-brand-500 mt-0.5">•</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-400">
        This is a screening aid, not a diagnosis. Only a clinical examination can confirm what stage
        of puberty a child is in.
      </p>
    </div>
  );
}

function MonitoringPlanCard({ plan }: { plan: MonitoringPlan }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5 border-t-4 border-amber-400 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <EventRepeatIcon fontSize="small" className="text-amber-600" />
        <h2 className="font-semibold text-ink">Follow-up plan</h2>
        <Chip label={`${plan.completedRounds}/${plan.totalRounds} done`} size="small" />
      </div>
      <p className="text-sm text-gray-600">
        When early signs show up, what matters most is whether they keep progressing. Repeating this
        screening every few months turns that into something you can show a doctor, rather than
        something you have to remember.
      </p>

      <Stepper activeStep={plan.completedRounds} alternativeLabel sx={{ mt: 1 }}>
        {plan.steps.map((step) => (
          <Step key={step.round} completed={!!step.completedAt}>
            <StepLabel>
              <span className="text-xs">
                {step.completedAt
                  ? new Date(step.completedAt).toLocaleDateString()
                  : step.dueAt
                    ? `Due ${new Date(step.dueAt).toLocaleDateString()}`
                    : 'Scheduled'}
              </span>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {plan.conclusion && (
        <Alert severity={plan.conclusion.title.includes('typical range') ? 'success' : 'warning'} icon={<CheckCircleIcon />}>
          <span className="font-semibold">{plan.conclusion.title}</span>
          <p className="text-sm mt-1">{plan.conclusion.summary}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {plan.conclusion.guidance.map((g) => (
              <li key={g} className="text-sm">
                • {g}
              </li>
            ))}
          </ul>
        </Alert>
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

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['puberty-history', selectedChildId],
    queryFn: async () =>
      (await api.get<ScreeningWithResult[]>('/puberty/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: plan } = useQuery({
    queryKey: ['puberty-plan', selectedChildId],
    queryFn: async () =>
      (await api.get<MonitoringPlan>('/puberty/plan', { params: { childId: selectedChildId } })).data,
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['puberty-history', selectedChildId] }),
        queryClient.invalidateQueries({ queryKey: ['puberty-plan', selectedChildId] }),
      ]);
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
  const firstName = selectedChild.nickname || selectedChild.fullName;

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

      {/* Landing state. The questionnaire used to be the first thing on the page, which asked
          people to start answering questions about their child's body with no explanation of
          what the screening does or what happens to the answers. */}
      {!historyLoading && !hasHistory && !formOpen && (
        <div className="bg-surface rounded-2xl shadow-sm p-6 border-t-4 border-brand-400 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PsychologyIcon className="text-brand-600" />
            <h2 className="font-semibold text-ink">Before you start</h2>
          </div>
          <p className="text-sm text-gray-600">
            This is a short questionnaire about the physical changes that mark the start of puberty.
            It takes a couple of minutes, and it compares what you report against the age ranges
            doctors use to decide whether development is early, typical, or late for {firstName}.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>Answer only what you have actually noticed — leave anything you're unsure about unchecked.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>Approximate ages are fine. "About when did you first notice it" is what's being asked.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>
                If the result suggests early development, you'll get a follow-up plan to repeat the
                screening every few months — alongside a recommendation to see a doctor.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>Answers are stored against {firstName}'s profile and visible only to their guardians.</span>
            </li>
          </ul>
          <Button variant="contained" size="large" onClick={() => setFormOpen(true)}>
            Start screening
          </Button>
        </div>
      )}

      {/* Result first, then the plan: the finding is what the parent came for, and the
          follow-up schedule only makes sense once they've read it. */}
      {lastResult && !formOpen && <ResultCard result={lastResult} />}

      {hasHistory && !formOpen && !lastResult && latestScreening && (
        <>
          <ResultCard result={latestScreening.result} />
          <p className="text-xs text-gray-400 -mt-3">
            From the screening on {new Date(latestScreening.assessedAt).toLocaleDateString()}.
          </p>
        </>
      )}

      {plan?.active && !formOpen && <MonitoringPlanCard plan={plan} />}

      {hasHistory && !formOpen && (
        <Button variant="contained" onClick={() => setFormOpen(true)}>
          {plan?.active ? 'Record the next follow-up' : 'Screen again'}
        </Button>
      )}

      {formOpen && (
        <>
          <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-ink">{isFemale ? 'For girls' : 'For boys'}</h2>
              <Button size="small" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
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
              label={
                isFemale
                  ? 'Has pubic or underarm hair growth been observed?'
                  : 'Has pubic, underarm, or facial hair growth been observed?'
              }
              checked={!!answers.pubicOrBodyHairGrowth}
              onCheckedChange={(v) => set('pubicOrBodyHairGrowth', v)}
              ageValue={answers.pubicOrBodyHairGrowthAgeYears}
              onAgeChange={(v) => set('pubicOrBodyHairGrowthAgeYears', v)}
            />

            <FormControlLabel
              control={
                <Checkbox checked={!!answers.growthSpurt} onChange={(e) => set('growthSpurt', e.target.checked)} />
              }
              label={
                <span className="text-sm">
                  Has the child experienced a noticeable recent increase in height growth rate?
                </span>
              }
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
              label={
                <span className="text-sm">
                  Any behavioral, mood, or skin changes (e.g., acne, body odor) associated with early
                  development?
                </span>
              }
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
              {mutation.isPending ? 'Saving…' : 'See result'}
            </Button>
          </div>
        </>
      )}

      {hasHistory && (
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-ink mb-3">History</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {(history ?? []).map((h) => (
              <div key={h.id} className="py-2 flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{new Date(h.assessedAt).toLocaleDateString()}</span>
                  <span
                    className={`text-xs font-medium ${
                      h.result.flagged ? 'text-amber-700 dark:text-amber-400' : 'text-brand-600'
                    }`}
                  >
                    {h.result.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{h.result.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
