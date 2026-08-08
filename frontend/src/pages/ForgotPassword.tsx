import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextField, Alert } from '@mui/material';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetToken(res.data.resetToken ?? null);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 page-fade-in">
      <div className="fixed top-4 right-4"><ThemeToggleButton size="medium" /></div>
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-brand-700 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we'll send you a link to reset it.
        </p>
        {submitted ? (
          <div className="flex flex-col gap-3">
            {resetToken ? (
              <>
                <Alert severity="info">
                  Email delivery isn't configured on this server, so here's your reset link
                  directly instead — in production this would arrive by email.
                </Alert>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/reset-password?token=${resetToken}`)}
                  sx={{ py: 1.2 }}
                >
                  Continue to reset password
                </Button>
              </>
            ) : (
              <Alert severity="success">
                If an account exists for that email, we've sent a password reset link to it.
                Check your inbox (and spam folder) — the link expires in 1 hour.
              </Alert>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
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
