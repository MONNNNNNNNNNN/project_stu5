import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, IconButton, Menu, Divider } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { api } from '../lib/api';
import type { Notification } from '../types';

export function NotificationsMenu({ size = 'medium' }: { size?: 'small' | 'medium' }) {
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const { data } = useQuery({
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

  const items = (data ?? []).slice(0, 6);
  const unread = data?.filter((n) => !n.isRead).length ?? 0;

  return (
    <>
      <IconButton size={size} onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Notifications">
        <Badge badgeContent={unread} color="error">
          <NotificationsNoneIcon fontSize={size} />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: '90vw' } } }}
      >
        <div className="px-4 py-2">
          <p className="font-heading font-semibold text-sm text-ink">Notifications</p>
        </div>
        <Divider />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 px-4 py-6 text-center">No notifications yet.</p>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              className={`flex items-start justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-brand-50 transition-colors ${
                n.isRead ? '' : 'bg-brand-50/60'
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-ink truncate">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
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
        </div>
        <Divider />
        <Link
          to="/notifications"
          onClick={() => setAnchorEl(null)}
          className="block text-center text-sm font-medium text-brand-600 py-2.5 hover:bg-brand-50 transition-colors"
        >
          View all
        </Link>
      </Menu>
    </>
  );
}
