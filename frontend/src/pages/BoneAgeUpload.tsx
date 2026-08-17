import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Alert, LinearProgress, IconButton } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { api } from '../lib/api';
import { useAuthedImage } from '../lib/useAuthedImage';
import { useChildren } from '../context/ChildContext';
import { ChildProfileCard } from '../components/ChildProfileCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { BoneAgePrediction } from '../types';
import { formatDate } from '../lib/formatDate';

/**
 * Thumbnail for one uploaded scan. A component rather than an inline <img> because the
 * bytes now come from a guardian-checked route, and that needs a hook — which can't be
 * called inside the history loop.
 */
function XrayThumb({ id }: { id: string }) {
  const src = useAuthedImage(`/bone-age/${id}/image`);

  if (!src) {
    return <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />;
  }
  return <img src={src} alt="X-ray" className="w-12 h-12 object-cover rounded-lg bg-gray-100" />;
}

export default function BoneAgeUpload() {
  const { selectedChildId, selectedChild } = useChildren();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ['bone-age-history', selectedChildId],
    queryFn: async () =>
      (await api.get<BoneAgePrediction[]>('/bone-age/history', { params: { childId: selectedChildId } })).data,
    enabled: !!selectedChildId,
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('childId', selectedChildId!);
      return (await api.post('/bone-age/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    // FR-16: show the API's actual reason (wrong type, too large) rather than failing silently.
    onError: (err: unknown) => {
      const res = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setUploadError(
        res?.status === 413
          ? 'That image is larger than 10MB. Try a smaller export.'
          : res?.data?.message ?? 'Could not upload that image. Use a JPEG or PNG under 10MB.',
      );
    },
    onSuccess: async () => {
      setUploadError(null);
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
    // Checked here too so an oversized file is rejected before it goes over the wire.
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('That image is larger than 10MB. Try a smaller export.');
      return;
    }
    setUploadError(null);
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

      {uploadError && <Alert severity="error" onClose={() => setUploadError(null)}>{uploadError}</Alert>}
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
        <UploadFileIcon fontSize="large" className="text-gray-500 mb-2" />
        <p className="font-medium text-ink">Drag and drop X-ray image here</p>
        <p className="text-xs text-gray-500 mb-4">Supports JPEG or PNG, max 10MB</p>
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

      <p className="text-xs text-gray-500">
        Disclaimer: The AI Bone Age Prediction is an investigational tool for educational
        tracking purposes only. It is not intended for primary medical diagnosis. Always consult
        a pediatric endocrinologist for clinical evaluations.
      </p>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">History</h2>
        <div className="flex flex-col gap-3">
          {(history ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
              <XrayThumb id={p.id} />
              <div className="flex-1">
                <p className="text-gray-500">{formatDate(p.createdAt)}</p>
                <p className="font-medium">
                  {p.status === 'COMPLETED' && p.predictedAgeMonths
                    ? `Predicted: ${p.predictedAgeMonths} months`
                    : 'Awaiting AI model integration'}
                </p>
              </div>
              <IconButton size="small" onClick={() => setPendingDelete(p.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </div>
          ))}
          {(history ?? []).length === 0 && <p className="text-sm text-gray-500">No uploads yet.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete upload?"
        message="This removes the X-ray and its analysis from the child's history."
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
