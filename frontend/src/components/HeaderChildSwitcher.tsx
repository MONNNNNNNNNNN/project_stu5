import { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useChildren } from '../context/ChildContext';
import { ChildAvatar } from './ChildAvatar';
import { ChildSwitcherDialog } from './ChildSwitcherDialog';

export function HeaderChildSwitcher({ compact = false }: { compact?: boolean }) {
  const { selectedChild } = useChildren();
  const [open, setOpen] = useState(false);

  if (!selectedChild) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Switch child"
        className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 bg-brand-50 hover:bg-brand-100 active:scale-95 transition-all"
      >
        <ChildAvatar
          avatarUrl={selectedChild.avatarUrl}
          fallbackLetter={selectedChild.fullName[0]?.toUpperCase() ?? '?'}
          size={compact ? 24 : 28}
        />
        {!compact && (
          <span className="text-sm font-medium text-brand-700 max-w-[100px] truncate">
            {selectedChild.nickname || selectedChild.fullName}
          </span>
        )}
        <ExpandMoreIcon fontSize="small" className="text-brand-500" />
      </button>
      <ChildSwitcherDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
