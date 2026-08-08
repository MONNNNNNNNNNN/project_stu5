import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Chip } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditIcon from '@mui/icons-material/EditOutlined';
import { ChildSwitcherDialog } from './ChildSwitcherDialog';
import { ChildAvatar } from './ChildAvatar';
import type { Child } from '../types';

function ageLabel(dateOfBirth: string) {
  const totalMonths = Math.floor(
    (Date.now() - new Date(dateOfBirth).getTime()) / (30.4375 * 24 * 60 * 60 * 1000),
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years < 1) return `${totalMonths} Months`;
  return `${years} Years, ${months} Months`;
}

function formatDate(dateOfBirth: string) {
  return new Date(dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ChildProfileCard({ child }: { child: Child }) {
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <section className="relative bg-surface rounded-3xl border border-brand-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
      <ChildAvatar avatarUrl={child.avatarUrl} fallbackLetter={child.fullName[0]?.toUpperCase() ?? '?'} size={88} border />
      <div className="text-center sm:text-left">
        <h1 className="font-heading font-bold text-2xl text-ink mb-0.5">{child.nickname || child.fullName}</h1>
        {child.nickname && child.nickname !== child.fullName && (
          <p className="text-sm text-gray-400 -mt-0.5">{child.fullName}</p>
        )}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
          <Chip label={child.sex === 'MALE' ? 'Boy' : 'Girl'} size="small" color="secondary" variant="outlined" />
          <Chip label={ageLabel(child.dateOfBirth)} size="small" variant="outlined" />
          <Chip label={`Born ${formatDate(child.dateOfBirth)}`} size="small" variant="outlined" />
        </div>
      </div>

      <IconButton
        onClick={() => setSwitcherOpen(true)}
        title="Switch child"
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          bgcolor: 'var(--color-brand-50)',
          '&:hover': { bgcolor: 'var(--color-brand-100)' },
        }}
      >
        <SwapHorizIcon className="text-brand-500" />
      </IconButton>
      <IconButton
        onClick={() => navigate(`/children/${child.id}/edit`)}
        title="Edit profile"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          bgcolor: 'primary.main',
          color: 'white',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <EditIcon fontSize="small" />
      </IconButton>

      <ChildSwitcherDialog open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </section>
  );
}
