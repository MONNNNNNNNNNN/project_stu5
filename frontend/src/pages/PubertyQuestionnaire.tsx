import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import type { PubertyScreening, TannerStage } from '../types';

const STAGES: { value: TannerStage; label: string; description: string }[] = [
  { value: 'STAGE_1', label: 'Stage 1', description: 'No visible pubertal changes yet (pre-pubertal).' },
  { value: 'STAGE_2', label: 'Stage 2', description: 'Early changes beginning — the first visible signs of puberty.' },
  { value: 'STAGE_3', label: 'Stage 3', description: 'Changes are clearly progressing and more noticeable.' },
  { value: 'STAGE_4', label: 'Stage 4', description: 'Development is well advanced, approaching adult appearance.' },
  { value: 'STAGE_5', label: 'Stage 5', description: 'Development appears complete (adult stage).' },
];

export default function PubertyQuestionnaire() {
  const { selectedChildId } = useChildren();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<TannerStage | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: history } = useQuery({
    queryKey: ['puberty-history', selectedChildId],
    queryFn: async () =>
      (await api.get<PubertyScreening[]>('/puberty/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/puberty/questionnaire', {
          childId: selectedChildId,
          tannerStage: stage,
          answers: { selectedStage: stage },
          notes: notes || undefined,
        })
      ).data,
    onSuccess: async () => {
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ['puberty-history', selectedChildId] });
    },
  });

  if (!selectedChildId) {
    return <p className="text-gray-500">Select or add a child first.</p>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-brand-700">Puberty Screening</h1>
        <p className="text-sm text-gray-500 mt-1">
          This is a self-report screening tool, not a clinical diagnosis. Talk to a pediatrician
          for a formal assessment.
        </p>
      </div>

      {submitted && (
        <Alert severity="success" onClose={() => setSubmitted(false)}>
          Screening saved.
        </Alert>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4">Which description best matches right now?</h2>
        <div className="flex flex-col gap-2">
          {STAGES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStage(s.value)}
              className={`flex items-start gap-3 text-left p-3 rounded-xl border ${
                stage === s.value ? 'border-brand-400 bg-brand-50' : 'border-gray-200'
              }`}
            >
              {stage === s.value ? (
                <CheckCircleIcon className="text-brand-600 mt-0.5" fontSize="small" />
              ) : (
                <RadioButtonUncheckedIcon className="text-gray-300 mt-0.5" fontSize="small" />
              )}
              <div>
                <p className="font-medium text-sm text-ink">{s.label}</p>
                <p className="text-xs text-gray-500">{s.description}</p>
              </div>
            </button>
          ))}
        </div>
        <TextField
          label="Additional notes (optional)"
          fullWidth
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 3 }}
        />
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          disabled={!stage || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Saving…' : 'Save screening'}
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">History</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {(history ?? []).map((h) => (
            <div key={h.id} className="py-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">{new Date(h.assessedAt).toLocaleDateString()}</span>
              <span className="font-medium">{STAGES.find((s) => s.value === h.tannerStage)?.label}</span>
            </div>
          ))}
          {(history ?? []).length === 0 && <p className="text-sm text-gray-500 py-2">No screenings yet.</p>}
        </div>
      </div>
    </div>
  );
}
