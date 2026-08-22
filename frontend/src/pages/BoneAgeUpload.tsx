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
import type { BoneAgeModelStatus, BoneAgePrediction } from '../types';
import { ageInMonths } from '../lib/age';
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

/** 138 -> "11 y 6 m" — months alone is not how a parent thinks about a child's age. */
function describeMonths(months: number) {
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  return m ? `${y} y ${m} m` : `${y} y`;
}

/** The gap is the clinically interesting quantity; a bone age alone says very little. */
function describeGap(boneMonths: number, chronoMonths: number) {
  const diff = Math.round(boneMonths - chronoMonths);
  if (Math.abs(diff) < 6) return 'close to their actual age';
  const amount = describeMonths(Math.abs(diff));
  return diff > 0 ? `about ${amount} ahead of their age` : `about ${amount} behind their age`;
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
    // Poll only while something is still being analysed. An unconditional interval would be
    // a permanent background request loop against a free-tier backend.
    refetchInterval: (q) => (q.state.data?.some((p) => p.status === 'PENDING') ? 2500 : false),
  });

  const { data: model } = useQuery({
    queryKey: ['bone-age-model-status'],
    queryFn: async () => (await api.get<BoneAgeModelStatus>('/bone-age/model-status')).data,
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
        'Image uploaded. It is being analysed now — the estimate appears in History below, usually within a few seconds.',
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

  const chronologicalMonths = selectedChild
    ? Math.round(ageInMonths(selectedChild.dateOfBirth, new Date()))
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {selectedChild && <ChildProfileCard child={selectedChild} />}
      <div>
        <h1 className="text-xl font-semibold text-brand-700">AI Bone Age Analysis</h1>
        {/*
          Answers the client's objection head-on: "AI ช่วยอะไร ถ้ายังต้องไปโรงพยาบาลอยู่ดี".
          It is a fair question and the page used to have no answer at all — it opened with
          "upload for an instant automated bone age estimation", which invites exactly that
          reply. The honest answer is in the TOR's own background: the bottleneck is not taking
          the film, it is that many facilities have no one able to read it.

          ⚠️ This framing is a proposal pending client question Q4. If they reject it, the
          feature needs rethinking rather than rewording.
        */}
        <p className="text-sm text-gray-500 mt-1">
          For parents who <span className="font-medium text-ink">already have a hand X-ray</span>{' '}
          and are waiting to find out what it means.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This does not replace the hospital visit. Taking the X-ray was never the hard part —
          the wait is usually for someone qualified to read it, and many clinics do not have a
          paediatric radiologist available. This gives you a provisional reading in the
          meantime, to bring to the appointment.
        </p>
      </div>

      {model?.calibration === 'provisional' && (
        <Alert severity="warning">
          <span className="font-semibold">Demo calibration.</span> The conversion from the
          model's raw output to months has not been confirmed by the team that trained it, so
          the ages below are indicative only and must not be relied on.
        </Alert>
      )}
      {model && !model.ready && (
        <Alert severity="info">Bone age analysis is unavailable right now. Your image is still saved.</Alert>
      )}
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
        An investigational tool, not a diagnosis. Only a paediatric endocrinologist can say what
        a bone age means for your child.
      </p>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">History</h2>
        <div className="flex flex-col gap-3">
          {(history ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
              <XrayThumb id={p.id} />
              <div className="flex-1">
                <p className="text-gray-500">{formatDate(p.createdAt)}</p>
                {p.status === 'COMPLETED' && p.predictedAgeMonths ? (
                  <>
                    <p className="font-medium">
                      Bone age {describeMonths(p.predictedAgeMonths)}
                      {chronologicalMonths !== null && (
                        <span className="font-normal text-gray-500">
                          {' · '}
                          {describeGap(p.predictedAgeMonths, chronologicalMonths)}
                        </span>
                      )}
                    </p>
                    {model && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Typical error about {Math.round(model.maeMonths)} months; roughly{' '}
                        {Math.round((1 - model.accuracyWithin12Months) * 100)}% of estimates are
                        out by more than a year.
                      </p>
                    )}
                  </>
                ) : p.status === 'FAILED' ? (
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Could not be analysed
                    {p.failureReason && (
                      <span className="block font-normal text-xs text-gray-500">
                        {p.failureReason}
                      </span>
                    )}
                  </p>
                ) : model && !model.ready ? (
                  <p className="font-medium text-gray-500">Saved — not analysed</p>
                ) : (
                  <p className="font-medium text-gray-500">Analysing…</p>
                )}
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
