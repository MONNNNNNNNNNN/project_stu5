import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Button, TextField, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import type { GrowthChartPoint, GrowthRecord } from '../types';

export default function GrowthTracking() {
  const { selectedChildId } = useChildren();
  const queryClient = useQueryClient();
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: chart } = useQuery({
    queryKey: ['growth-chart', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthChartPoint[]>('/growth/chart', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const { data: history } = useQuery({
    queryKey: ['growth-history', selectedChildId],
    queryFn: async () =>
      (await api.get<GrowthRecord[]>('/growth/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

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
      ).data,
    onSuccess: async () => {
      setHeightCm('');
      setWeightKg('');
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-700">Growth Tracking</h1>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4">Log a new measurement</h2>
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

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4">Height &amp; Weight over time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chart ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e9df" />
            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })} fontSize={12} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="heightCm" stroke="#46897a" strokeWidth={2} name="Height (cm)" />
            <Line yAxisId="right" type="monotone" dataKey="weightKg" stroke="#87a480" strokeWidth={2} name="Weight (kg)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-4">History</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {(history ?? []).map((record) =>
            editingId === record.id ? (
              <div key={record.id} className="py-2 flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0">{new Date(record.measuredAt).toLocaleDateString()}</span>
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
              <div key={record.id} className="py-2 flex items-center justify-between text-sm gap-2">
                <span className="text-gray-500">{new Date(record.measuredAt).toLocaleDateString()}</span>
                <span>{record.heightCm ? `${record.heightCm} cm` : '—'}</span>
                <span>{record.weightKg ? `${record.weightKg} kg` : '—'}</span>
                <span className="text-gray-400">{record.bmi ? `BMI ${record.bmi}` : ''}</span>
                <span className="flex items-center gap-1">
                  <IconButton size="small" onClick={() => startEdit(record)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (confirm('Delete this measurement?')) deleteMutation.mutate(record.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </div>
            ),
          )}
          {(history ?? []).length === 0 && <p className="text-sm text-gray-500 py-4">No measurements yet.</p>}
        </div>
      </div>
    </div>
  );
}
