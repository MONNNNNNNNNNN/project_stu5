import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, Alert, Chip, Stepper, Step, StepLabel, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventRepeatIcon from '@mui/icons-material/EventRepeatOutlined';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import { ChildProfileCard } from '../components/ChildProfileCard';
import type { PubertyScreening } from '../types';
import { formatDate } from '../lib/formatDate';

/**
 * Yes / no / not sure.
 *
 * "Not sure" is a real answer, not a skipped question. A parent who works away, or whose
 * child lives with grandparents, genuinely cannot see several of these signs — and treating
 * that silence as "no" is what used to raise a delayed-development flag on a child who was
 * developing perfectly normally.
 */
type SignAnswer = 'yes' | 'no' | 'unsure';

interface Answers {
  breastDevelopment?: SignAnswer;
  breastDevelopmentAgeYears?: number;
  menstruation?: SignAnswer;
  menstruationAgeYears?: number;
  testicularOrGenitalEnlargement?: SignAnswer;
  testicularOrGenitalEnlargementAgeYears?: number;
  voiceDeepening?: SignAnswer;
  pubicOrBodyHairGrowth?: SignAnswer;
  pubicOrBodyHairGrowthAgeYears?: number;
  growthSpurt?: SignAnswer;
  rapidClothingOrShoeSizeChange?: SignAnswer;
  bodyOdourChange?: SignAnswer;
  acne?: SignAnswer;
  familyPubertyOnsetAgeYears?: number;
  behavioralMoodSkinChanges?: SignAnswer;
  otherHealthNotes?: string;
  answeredBy?: string;
}

type PubertyOutcome =
  | 'NO_SIGNS_YET'
  | 'TYPICAL_ONSET'
  | 'EARLY_SIGNS'
  | 'DELAYED_ONSET'
  | 'INSUFFICIENT_INFO';

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
  // Deliberately not a warning. Nothing has been found; we simply could not tell.
  INSUFFICIENT_INFO: 'info',
};

/**
 * One sign, answered yes / no / not sure.
 *
 * `description` exists because the clinical term alone is not answerable by a parent —
 * "thelarche" and even "testicular or genital enlargement" describe something the reader has
 * to already know to recognise. The description says what it actually looks like.
 */
function SignQuestion({
  label,
  description,
  value,
  onChange,
  ageValue,
  onAgeChange,
}: {
  label: string;
  description?: string;
  value?: SignAnswer;
  onChange: (v: SignAnswer) => void;
  ageValue?: number;
  onAgeChange?: (v: number | undefined) => void;
}) {
  const options: { v: SignAnswer; label: string }[] = [
    { v: 'yes', label: 'Yes' },
    { v: 'no', label: 'No' },
    { v: 'unsure', label: "Not sure" },
  ];
  return (
    <div className="flex flex-col gap-2 border border-gray-100 rounded-xl p-3">
      <div>
        <p className="text-sm text-ink">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={value ?? null}
          onChange={(_, v: SignAnswer | null) => v && onChange(v)}
          aria-label={label}
        >
          {options.map((o) => (
            <ToggleButton key={o.v} value={o.v} sx={{ textTransform: 'none', px: 1.75 }}>
              {o.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {value === 'yes' && onAgeChange && (
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
    </div>
  );
}

function ResultCard({ result }: { result: ScreeningResult }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
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

      <p className="text-xs text-gray-500">
        A screening aid, not a diagnosis. Only an examination can confirm what stage a child is in.
      </p>
    </div>
  );
}

function MonitoringPlanCard({ plan }: { plan: MonitoringPlan }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <EventRepeatIcon fontSize="small" className="text-amber-600" />
        <h2 className="font-semibold text-ink">Follow-up plan</h2>
        <Chip label={`${plan.completedRounds}/${plan.totalRounds} done`} size="small" />
      </div>
      <p className="text-sm text-gray-600">
        What matters is whether the signs keep progressing. Repeating this every few months gives
        a doctor something dated to read, instead of something you have to remember.
      </p>

      <Stepper activeStep={plan.completedRounds} alternativeLabel sx={{ mt: 1 }}>
        {plan.steps.map((step) => (
          <Step key={step.round} completed={!!step.completedAt}>
            <StepLabel>
              <span className="text-xs">
                {step.completedAt
                  ? formatDate(step.completedAt)
                  : step.dueAt
                    ? `Due ${formatDate(step.dueAt)}`
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
        <div className="bg-surface rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PsychologyIcon className="text-brand-600" />
            <h2 className="font-semibold text-ink">Before you start</h2>
          </div>
          <p className="text-sm text-gray-600">
            A few questions about the physical changes that mark the start of puberty, checked
            against the age ranges doctors use for {firstName}. Two minutes.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>
                <span className="font-medium text-ink">"Not sure" is a real answer.</span> Some of
                these are not visible unless you are with {firstName} every day. Saying so is far
                more useful than guessing — a guess can send the wrong family to a doctor.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>Approximate ages are fine — "about when did you first notice it".</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>
                If it suggests early development, you get a follow-up plan and a recommendation to
                see a doctor.
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
          <p className="text-xs text-gray-500 -mt-3">
            From the screening on {formatDate(latestScreening.assessedAt)}.
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
                  label="Has breast development begun?"
                  description="The first sign is usually a small, sometimes tender lump under one or both nipples — often one side before the other. Clinically this is called thelarche."
                  value={answers.breastDevelopment}
                  onChange={(v) => set('breastDevelopment', v)}
                  ageValue={answers.breastDevelopmentAgeYears}
                  onAgeChange={(v) => set('breastDevelopmentAgeYears', v)}
                />
                <SignQuestion
                  label="Have her periods started?"
                  description="The first menstrual period. This usually happens about two years after breast development begins."
                  value={answers.menstruation}
                  onChange={(v) => set('menstruation', v)}
                  ageValue={answers.menstruationAgeYears}
                  onAgeChange={(v) => set('menstruationAgeYears', v)}
                />
              </>
            ) : (
              <>
                <SignQuestion
                  label="Have the testicles or genitals started to grow?"
                  description="Usually the earliest sign in boys: the testicles get larger before anything else changes. It is easy to miss unless you are looking for it."
                  value={answers.testicularOrGenitalEnlargement}
                  onChange={(v) => set('testicularOrGenitalEnlargement', v)}
                  ageValue={answers.testicularOrGenitalEnlargementAgeYears}
                  onAgeChange={(v) => set('testicularOrGenitalEnlargementAgeYears', v)}
                />
                <SignQuestion
                  label="Has his voice started to deepen?"
                  description="Getting lower, or cracking and breaking between high and low."
                  value={answers.voiceDeepening}
                  onChange={(v) => set('voiceDeepening', v)}
                />
              </>
            )}

            <SignQuestion
              label={isFemale ? 'Has pubic or underarm hair appeared?' : 'Has pubic, underarm, or facial hair appeared?'}
              description="The first hairs are usually fine and straight, and become coarser and curlier over time."
              value={answers.pubicOrBodyHairGrowth}
              onChange={(v) => set('pubicOrBodyHairGrowth', v)}
              ageValue={answers.pubicOrBodyHairGrowthAgeYears}
              onAgeChange={(v) => set('pubicOrBodyHairGrowthAgeYears', v)}
            />

            <SignQuestion
              label="Has the child been growing noticeably faster recently?"
              description="A growth spurt — suddenly getting taller much faster than in previous years."
              value={answers.growthSpurt}
              onChange={(v) => set('growthSpurt', v)}
            />
          </div>

          {/*
            Indirect signs. These exist for the parent who is not with the child every day —
            everything above needs close observation, and these do not. None of them decides
            an outcome on its own, but together they turn "we cannot tell" into something
            concrete to raise at an appointment.
          */}
          <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div>
              <h2 className="font-semibold text-ink">Things you may have noticed indirectly</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Answer these even if you were unsure about the questions above — they are often
                easier to spot, and they still tell a doctor something useful.
              </p>
            </div>

            <SignQuestion
              label="Is the child outgrowing clothes or shoes unusually fast?"
              description="Needing the next shoe size or a new uniform much sooner than before."
              value={answers.rapidClothingOrShoeSizeChange}
              onChange={(v) => set('rapidClothingOrShoeSizeChange', v)}
            />
            <SignQuestion
              label="Has their body odour changed?"
              description="Adult-type body odour, or needing to wash or use deodorant when they did not before."
              value={answers.bodyOdourChange}
              onChange={(v) => set('bodyOdourChange', v)}
            />
            <SignQuestion
              label="Have they developed acne or oily skin?"
              description="Spots on the face, back or chest, or skin and hair becoming greasier."
              value={answers.acne}
              onChange={(v) => set('acne', v)}
            />

            <TextField
              size="small"
              label="Who answered these questions? (optional)"
              placeholder="e.g. grandmother, school nurse, other parent"
              helperText="If someone who sees the child more often helped, note it here so the answers can be read in context."
              value={answers.answeredBy ?? ''}
              onChange={(e) => set('answeredBy', e.target.value)}
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
            <SignQuestion
              label="Have there been noticeable changes in mood or behaviour?"
              description="More irritable, more private, or bigger swings in mood than before."
              value={answers.behavioralMoodSkinChanges}
              onChange={(v) => set('behavioralMoodSkinChanges', v)}
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
                  <span className="text-gray-500">{formatDate(h.assessedAt)}</span>
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
