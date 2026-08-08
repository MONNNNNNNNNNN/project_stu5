import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, TextField, Alert } from '@mui/material';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { api } from '../lib/api';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../lib/passwordRules';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordInvalid = newPassword.length > 0 && !PASSWORD_REGEX.test(newPassword);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!PASSWORD_REGEX.test(newPassword)) {
      setError(PASSWORD_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
    } catch {
      setError('That reset token is invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="fixed top-4 right-4"><ThemeToggleButton size="medium" /></div>
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-brand-700 mb-1">Set a new password</h1>
        {done ? (
          <div className="flex flex-col gap-4 mt-4">
            <Alert severity="success">Password updated. You can log in now.</Alert>
            <Button variant="contained" onClick={() => navigate('/login')} sx={{ py: 1.2 }}>
              Go to login
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">Paste your reset token and choose a new password.</p>
            {error && <Alert severity="error" className="mb-4">{error}</Alert>}
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <TextField
                label="Reset token"
                fullWidth
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <TextField
                label="New password"
                type="password"
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={passwordInvalid}
                helperText={passwordInvalid ? PASSWORD_MESSAGE : 'At least 8 characters, with a letter and a number'}
              />
              <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
                {loading ? 'Saving…' : 'Reset password'}
              </Button>
            </form>
          </>
        )}
        <p className="text-sm text-gray-500 text-center mt-6">
          <Link to="/login" className="text-brand-600 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
