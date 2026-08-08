import { Avatar } from '@mui/material';
import { getAvatarPreset } from '../lib/childAvatars';

interface Props {
  avatarUrl?: string | null;
  fallbackLetter: string;
  size?: number;
  border?: boolean;
}

export function ChildAvatar({ avatarUrl, fallbackLetter, size = 56, border }: Props) {
  const preset = getAvatarPreset(avatarUrl);

  if (preset) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: preset.bg,
          fontSize: size * 0.55,
          border: border ? '4px solid var(--color-brand-50)' : undefined,
        }}
      >
        {preset.emoji}
      </div>
    );
  }

  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: '#006b5f',
        fontSize: size * 0.36,
        border: border ? '4px solid var(--color-brand-50)' : undefined,
      }}
    >
      {fallbackLetter}
    </Avatar>
  );
}
