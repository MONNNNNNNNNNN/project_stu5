import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Avatar, Button, TextField, Alert } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_BASE_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => (await api.patch('/auth/profile', { fullName })).data,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => (await api.delete('/users/me')).data,
    onSuccess: async () => {
      await logout();
      navigate('/');
    },
  });

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  if (!user) return null;

  const avatarSrc = user.avatarUrl ? `${API_BASE_URL}${user.avatarUrl}` : undefined;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Avatar src={avatarSrc} sx={{ width: 72, height: 72, bgcolor: '#006b5f', fontSize: 28 }}>
          {user.fullName[0]?.toUpperCase()}
        </Avatar>
        <h1 className="text-xl font-semibold text-brand-700">{user.fullName}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
        <Button component={Link} to="/settings" size="small" startIcon={<SettingsOutlinedIcon />} sx={{ mt: 0.5 }}>
          Photo &amp; password settings
        </Button>
      </div>

      {saved && <Alert severity="success" onClose={() => setSaved(false)}>Profile updated.</Alert>}

      <div className="bg-surface rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-ink">Account</h2>
        <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
        <Button
          variant="contained"
          disabled={mutation.isPending || !fullName}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <Button variant="outlined" fullWidth onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">Danger zone</h2>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          disabled={deleteAccountMutation.isPending}
          onClick={() => setConfirmDeleteAccount(true)}
        >
          {deleteAccountMutation.isPending ? 'Deleting…' : 'Delete account'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDeleteAccount}
        title="Delete your account?"
        warning="Every child profile, growth record, screening, and bone age upload is deleted with it."
        message="This cannot be undone. You'll be signed out immediately."
        confirmLabel="Delete account"
        busy={deleteAccountMutation.isPending}
        onCancel={() => setConfirmDeleteAccount(false)}
        onConfirm={() => deleteAccountMutation.mutate()}
      />
    </div>
  );
}
