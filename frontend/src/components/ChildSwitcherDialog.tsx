import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useChildren } from '../context/ChildContext';
import { ChildAvatar } from './ChildAvatar';

function age(dateOfBirth: string) {
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years < 1 ? `${Math.floor(years * 12)} months` : `${Math.floor(years)} years`;
}

export function ChildSwitcherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { children, selectedChildId, selectChild } = useChildren();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-heading">Switch child</DialogTitle>
      <DialogContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  selectChild(child.id);
                  onClose();
                }}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500'
                    : 'border-brand-100 bg-surface hover:border-brand-300 hover:-translate-y-0.5'
                }`}
              >
                {isSelected && (
                  <CheckCircleIcon fontSize="small" className="absolute top-2 right-2 text-brand-500" />
                )}
                <ChildAvatar avatarUrl={child.avatarUrl} fallbackLetter={child.fullName[0]?.toUpperCase() ?? '?'} size={72} />
                <div className="text-center">
                  <p className="font-medium text-sm text-ink">{child.nickname || child.fullName}</p>
                  <p className="text-xs text-gray-500">{age(child.dateOfBirth)} old</p>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/children/new');
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 p-4 text-brand-500 hover:border-brand-400 hover:bg-brand-50 transition-all min-h-[132px]"
          >
            <AddIcon />
            <span className="text-sm font-medium">Add child</span>
          </button>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          size="small"
          onClick={() => {
            onClose();
            navigate('/children');
          }}
        >
          Manage children
        </Button>
      </DialogActions>
    </Dialog>
  );
}
