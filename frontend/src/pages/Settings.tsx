import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar, Button, TextField, Alert, IconButton } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAltOutlined';
import { api } from '../lib/api';
import { ownAvatarPath, useAuthedImage } from '../lib/useAuthedImage';
import { avatarSx } from '../lib/chartTheme';
import { useThemeMode } from '../context/ThemeModeContext';
import { useAuth } from '../context/AuthContext';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../lib/passwordRules';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: (updated) => {
      updateUser(updated);
      setAvatarError(null);
    },
    onError: () => setAvatarError('Could not upload image. Use JPEG, PNG, or WebP under 5MB.'),
  });

  const passwordMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/change-password', { currentPassword, newPassword })).data,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
      setPasswordError(null);
    },
    onError: () => setPasswordError('Current password is incorrect.'),
  });

  const avatarSrc = useAuthedImage(ownAvatarPath(user?.avatarUrl)) ?? undefined;
  const { mode } = useThemeMode();

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-700">Settings</h1>

      <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3">
        <h2 className="font-semibold text-ink self-start mb-1">Profile photo</h2>
        <div className="relative">
          <Avatar src={avatarSrc} sx={{ width: 96, height: 96, ...avatarSx(mode), fontSize: 36 }}>
            {user.fullName[0]?.toUpperCase()}
          </Avatar>
          <IconButton
            size="small"
            onClick={() => inputRef.current?.click()}
            sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <CameraAltIcon fontSize="small" />
          </IconButton>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) avatarMutation.mutate(file);
            }}
          />
        </div>
        {avatarMutation.isPending && <p className="text-xs text-gray-500">Uploading…</p>}
        {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-ink">Change password</h2>
        {passwordSaved && (
          <Alert severity="success" onClose={() => setPasswordSaved(false)}>
            Password updated.
          </Alert>
        )}
        {passwordError && <Alert severity="error">{passwordError}</Alert>}
        <TextField
          label="Current password"
          type="password"
          fullWidth
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <TextField
          label="New password"
          type="password"
          fullWidth
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={newPassword.length > 0 && !PASSWORD_REGEX.test(newPassword)}
          helperText={
            newPassword.length > 0 && !PASSWORD_REGEX.test(newPassword)
              ? PASSWORD_MESSAGE
              : 'At least 8 characters, with a letter and a number'
          }
        />
        <Button
          variant="contained"
          disabled={passwordMutation.isPending || !currentPassword || !PASSWORD_REGEX.test(newPassword)}
          onClick={() => passwordMutation.mutate()}
        >
          {passwordMutation.isPending ? 'Saving…' : 'Update password'}
        </Button>
      </div>
    </div>
  );
}
