import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import { ChildAvatar } from './ChildAvatar';
import type { Child } from '../types';

function age(dateOfBirth: string) {
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years < 1 ? `${Math.floor(years * 12)} months` : `${Math.floor(years)} years`;
}

export function ChildSwitcherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { children, selectedChildId, selectChild } = useChildren();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [manageMode, setManageMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Child | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/children/${id}`)).data,
    onSuccess: async (_data, deletedId) => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      if (deletedId === selectedChildId) {
        const remaining = children.filter((c) => c.id !== deletedId);
        if (remaining[0]) selectChild(remaining[0].id);
      }
      setPendingDelete(null);
    },
  });

  function handleClose() {
    setManageMode(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-heading">{manageMode ? 'Remove a child' : 'Switch child'}</DialogTitle>
      <DialogContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <div
                key={child.id}
                role={manageMode ? undefined : 'button'}
                tabIndex={manageMode ? undefined : 0}
                onClick={
                  manageMode
                    ? undefined
                    : () => {
                        selectChild(child.id);
                        handleClose();
                      }
                }
                onKeyDown={
                  manageMode
                    ? undefined
                    : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          selectChild(child.id);
                          handleClose();
                        }
                      }
                }
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500'
                    : 'border-brand-100 bg-surface hover:border-brand-300 hover:-translate-y-0.5'
                } ${manageMode ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {manageMode ? (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(child);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'error.main',
                      color: 'white',
                      width: 24,
                      height: 24,
                      '&:hover': { bgcolor: 'error.dark' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                ) : (
                  isSelected && <CheckCircleIcon fontSize="small" className="absolute top-2 right-2 text-brand-500" />
                )}
                <ChildAvatar avatarUrl={child.avatarUrl} fallbackLetter={child.fullName[0]?.toUpperCase() ?? '?'} size={72} />
                <div className="text-center">
                  <p className="font-medium text-sm text-ink">{child.nickname || child.fullName}</p>
                  <p className="text-xs text-gray-500">{age(child.dateOfBirth)} old</p>
                </div>
              </div>
            );
          })}

          {!manageMode && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                navigate('/children/new');
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 p-4 text-brand-500 hover:border-brand-400 hover:bg-brand-50 transition-all min-h-[132px]"
            >
              <AddIcon />
              <span className="text-sm font-medium">Add child</span>
            </button>
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" color={manageMode ? 'primary' : 'inherit'} onClick={() => setManageMode((m) => !m)}>
          {manageMode ? 'Done' : 'Manage'}
        </Button>
      </DialogActions>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-heading">Remove child?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This permanently deletes their growth, screening, and bone age history.
          </Alert>
          <p className="text-sm text-ink">
            Remove {pendingDelete?.nickname || pendingDelete?.fullName}? This can't be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
