export interface AvatarPreset {
  id: string;
  src: string;
  bg: string;
}

export const CHILD_AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'hair01', src: '/avatars/avatar_hair01.png', bg: '#fbe0dd' },
  { id: 'hair03', src: '/avatars/avatar_hair03.png', bg: '#dbe7f5' },
  { id: 'hair06', src: '/avatars/avatar_hair06.png', bg: '#fdf1cf' },
  { id: 'hair07', src: '/avatars/avatar_hair07.png', bg: '#e2f0e4' },
  { id: 'hair08', src: '/avatars/avatar_hair08.png', bg: '#ece1f7' },
];

export function getAvatarPreset(key?: string | null) {
  return CHILD_AVATAR_PRESETS.find((a) => a.id === key) ?? null;
}
