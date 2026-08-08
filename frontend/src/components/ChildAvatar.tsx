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
        className="rounded-full shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          backgroundColor: preset.bg,
          border: border ? '4px solid var(--color-brand-50)' : undefined,
        }}
      >
        <img
          src={preset.src}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: '50% 15%', transform: 'scale(1.35)', transformOrigin: '50% 20%' }}
        />
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
