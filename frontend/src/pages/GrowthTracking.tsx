import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, IconButton, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../lib/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ageInMonths } from '../lib/age';
import { formatDate } from '../lib/formatDate';
import { useChildren } from '../context/ChildContext';
import { PercentileChart } from '../components/PercentileChart';
import { ChildProfileCard } from '../components/ChildProfileCard';
import type { GrowthChartPoint, GrowthRecord, ReferenceCurvePoint } from '../types';

function fmtPercentile(p: string | null) {
  return p !== null ? `P${Math.round(Number(p))}` : '—';
}

export default function GrowthTracking() {
  const { selectedChildId, selectedChild } = useChildren();
  const queryClient = useQueryClient();
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [lastGuidance, setLastGuidance] = useState<GrowthRecord['guidance'] | null>(null);

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

  const { data: weightCurve } = useQuery({
    queryKey: ['growth-reference-curve', selectedChildId, 'weight'],
    queryFn: async () =>
      (
        await api.get<ReferenceCurvePoint[]>('/growth/reference-curve', {
          params: { childId: selectedChildId, measure: 'weight' },
        })
      ).data,
    enabled: !!selectedChildId,
  });

  const { data: bmiCurve } = useQuery({
    queryKey: ['growth-reference-curve', selectedChildId, 'bmi'],
    queryFn: async () =>
      (
        await api.get<ReferenceCurvePoint[]>('/growth/reference-curve', {
          params: { childId: selectedChildId, measure: 'bmi' },
        })
      ).data,
    enabled: !!selectedChildId,
  });

  const { data: history } = useQuery({
    queryKey: ['growth-history', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthRecord[]>('/growth/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ['growth-chart', selectedChildId] });
    await queryClient.invalidateQueries({ queryKey: ['growth-history', selectedChildId] });
    await queryClient.invalidateQueries({ queryKey: ['growth-statistics', selectedChildId] });
  }

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/growth', {
          childId: selectedChildId,
          heightCm: heightCm ? Number(heightCm) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          measuredAt: new Date(measuredAt).toISOString(),
        })
      ).data as GrowthRecord,
    onSuccess: async (record) => {
      setHeightCm('');
      setWeightKg('');
      setLastGuidance(record.guidance ?? null);
      await invalidateAll();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) =>
      (
        await api.patch(`/growth/${id}`, {
          heightCm: editHeight ? Number(editHeight) : undefined,
          weightKg: editWeight ? Number(editWeight) : undefined,
        })
      ).data,
    onSuccess: async () => {
      setEditingId(null);
      await invalidateAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/growth/${id}`)).data,
    onSuccess: invalidateAll,
  });

  function startEdit(record: GrowthRecord) {
    setEditingId(record.id);
    setEditHeight(record.heightCm ?? '');
    setEditWeight(record.weightKg ?? '');
  }

  if (!selectedChildId) {
    return <p className="text-gray-500">Select or add a child first.</p>;
  }

  const heightPoints = (chart ?? []).map((c) => ({
    ageMonths: selectedChild ? ageInMonths(selectedChild.dateOfBirth, c.date) : 0,
    value: c.heightCm,
  }));
  const weightPoints = (chart ?? []).map((c) => ({
    ageMonths: selectedChild ? ageInMonths(selectedChild.dateOfBirth, c.date) : 0,
    value: c.weightKg,
  }));
  const bmiPoints = (chart ?? []).map((c) => ({
    ageMonths: selectedChild ? ageInMonths(selectedChild.dateOfBirth, c.date) : 0,
    value: c.bmi,
  }));

  return (
    <div className="flex flex-col gap-6">
      {selectedChild && <ChildProfileCard child={selectedChild} />}
      <h1 className="text-xl font-semibold text-brand-700">Growth Tracking</h1>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4">Log a new measurement</h2>
        {lastGuidance && (
          <Alert severity={lastGuidance.flagged ? 'warning' : 'success'} className="mb-4" onClose={() => setLastGuidance(null)}>
            {lastGuidance.message}
            {lastGuidance.nutritionalStatus && ` Nutritional status: ${lastGuidance.nutritionalStatus}.`}
          </Alert>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <TextField label="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          <TextField label="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          <TextField
            label="Date"
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Add measurement'}
          </Button>
        </form>
      </div>

      <PercentileChart title="Height-for-age" unit="cm" curve={heightCurve ?? []} points={heightPoints} measure="height" />
      <PercentileChart title="Weight-for-age" unit="kg" curve={weightCurve ?? []} points={weightPoints} measure="weight" />
      <PercentileChart
        title="BMI-for-age"
        unit=""
        curve={bmiCurve ?? []}
        points={bmiPoints}
        measure="bmi"
        footnote="BMI-for-age applies to children aged 5 years and above."
      />

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4">History</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {(history ?? []).map((record) =>
            editingId === record.id ? (
              <div key={record.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0">{formatDate(record.measuredAt)}</span>
                <TextField
                  size="small"
                  label="Height (cm)"
                  type="number"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  sx={{ width: 110 }}
                />
                <TextField
                  size="small"
                  label="Weight (kg)"
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  sx={{ width: 110 }}
                />
                <IconButton
                  size="small"
                  color="primary"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate(record.id)}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setEditingId(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
            ) : (
              <div key={record.id} className="py-3 flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-gray-500">{formatDate(record.measuredAt)}</span>
                  <span>{record.heightCm ? `${record.heightCm} cm (${fmtPercentile(record.heightPercentile)})` : '—'}</span>
                  <span>{record.weightKg ? `${record.weightKg} kg (${fmtPercentile(record.weightPercentile)})` : '—'}</span>
                  <span className="text-gray-500">{record.bmi ? `BMI ${record.bmi}` : ''}</span>
                  <span className="flex items-center gap-1 ml-auto">
                    <IconButton size="small" onClick={() => startEdit(record)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setPendingDelete(record.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </div>
                {record.guidance?.flagged && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">{record.guidance.message}</p>
                )}
              </div>
            ),
          )}
          {(history ?? []).length === 0 && <p className="text-sm text-gray-500 py-4">No measurements yet.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete measurement?"
        message="This removes the entry from the growth chart and history."
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
