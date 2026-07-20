import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, TextField, Alert } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
      navigate('/login');
    },
  });

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleDeleteAccount() {
    if (confirm('Delete your account? This cannot be undone.')) {
      deleteAccountMutation.mutate();
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Avatar sx={{ width: 72, height: 72, bgcolor: '#87a480', fontSize: 28 }}>
          {user.fullName[0]?.toUpperCase()}
        </Avatar>
        <h1 className="text-xl font-semibold text-brand-700">{user.fullName}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      {saved && <Alert severity="success" onClose={() => setSaved(false)}>Profile updated.</Alert>}

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
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

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <Button variant="outlined" fullWidth onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-ink mb-3">Danger zone</h2>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          disabled={deleteAccountMutation.isPending}
          onClick={handleDeleteAccount}
        >
          {deleteAccountMutation.isPending ? 'Deleting…' : 'Delete account'}
        </Button>
      </div>
    </div>
  );
}
