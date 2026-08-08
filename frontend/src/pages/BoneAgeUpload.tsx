import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Alert, LinearProgress, IconButton } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { api, API_BASE_URL } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import { ChildProfileCard } from '../components/ChildProfileCard';
import type { BoneAgePrediction } from '../types';

export default function BoneAgeUpload() {
  const { selectedChildId, selectedChild } = useChildren();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ['bone-age-history', selectedChildId],
    queryFn: async () =>
      (await api.get<BoneAgePrediction[]>('/bone-age/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('childId', selectedChildId!);
      return (await api.post('/bone-age/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bone-age-history', selectedChildId] });
      setNotice(
        'Image uploaded. AI bone age prediction is not connected yet — the model is being trained separately and will be wired in soon.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/bone-age/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bone-age-history', selectedChildId] }),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    uploadMutation.mutate(file);
  }

  if (!selectedChildId) {
    return <p className="text-gray-500">Select or add a child first.</p>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {selectedChild && <ChildProfileCard child={selectedChild} />}
      <div>
        <h1 className="text-xl font-semibold text-brand-700">AI Bone Age Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a left-hand radiograph for an instant automated bone age estimation.
        </p>
      </div>

      {notice && <Alert severity="info" onClose={() => setNotice(null)}>{notice}</Alert>}
      {uploadMutation.isPending && <LinearProgress />}

      <div
        className="bg-surface rounded-2xl shadow-sm p-8 border-2 border-dashed border-gray-200 flex flex-col items-center text-center cursor-pointer hover:border-brand-300"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <UploadFileIcon fontSize="large" className="text-gray-400 mb-2" />
        <p className="font-medium text-ink">Drag and drop X-ray image here</p>
        <p className="text-xs text-gray-400 mb-4">Supports JPEG or PNG, max 10MB</p>
        <Button variant="contained" color="secondary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <p className="text-xs text-gray-400">
        Disclaimer: The AI Bone Age Prediction is an investigational tool for educational
        tracking purposes only. It is not intended for primary medical diagnosis. Always consult
        a pediatric endocrinologist for clinical evaluations.
      </p>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">History</h2>
        <div className="flex flex-col gap-3">
          {(history ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
              <img src={`${API_BASE_URL}${p.imageUrl}`} alt="X-ray" className="w-12 h-12 object-cover rounded-lg bg-gray-100" />
              <div className="flex-1">
                <p className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                <p className="font-medium">
                  {p.status === 'COMPLETED' && p.predictedAgeMonths
                    ? `Predicted: ${p.predictedAgeMonths} months`
                    : 'Awaiting AI model integration'}
                </p>
              </div>
              <IconButton
                size="small"
                onClick={() => {
                  if (confirm('Delete this upload?')) deleteMutation.mutate(p.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </div>
          ))}
          {(history ?? []).length === 0 && <p className="text-sm text-gray-500">No uploads yet.</p>}
        </div>
      </div>
    </div>
  );
}
