export interface AvatarPreset {
  id: string;
  emoji: string;
  bg: string;
}

export const CHILD_AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'bear', emoji: '🐻', bg: '#f4d9b0' },
  { id: 'cat', emoji: '🐱', bg: '#f0c9d8' },
  { id: 'fox', emoji: '🦊', bg: '#f6cba3' },
  { id: 'rabbit', emoji: '🐰', bg: '#e4d9f7' },
  { id: 'panda', emoji: '🐼', bg: '#dfe7ea' },
  { id: 'lion', emoji: '🦁', bg: '#fbe3a3' },
  { id: 'penguin', emoji: '🐧', bg: '#cfe3ee' },
  { id: 'koala', emoji: '🐨', bg: '#d8dee0' },
];

export function getAvatarPreset(key?: string | null) {
  return CHILD_AVATAR_PRESETS.find((a) => a.id === key) ?? null;
}
