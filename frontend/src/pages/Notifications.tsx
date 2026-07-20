import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { api } from '../lib/api';
import type { Notification } from '../types';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}`, {})).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/notifications/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-brand-700">Notifications</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="flex flex-col gap-2">
        {(data ?? []).map((n) => (
          <div
            key={n.id}
            onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
            className={`flex items-start justify-between gap-3 rounded-2xl p-4 shadow-sm cursor-pointer ${
              n.isRead ? 'bg-white' : 'bg-brand-50'
            }`}
          >
            <div>
              <p className="font-medium text-sm text-ink">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              <p className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(n.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-gray-500">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
