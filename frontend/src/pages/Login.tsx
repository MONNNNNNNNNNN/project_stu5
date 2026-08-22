import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, TextField, Alert } from '@mui/material';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { ColdStartNotice } from '../components/ColdStartNotice';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      // A timed-out cold start isn't a credential problem — telling someone their password
      // is wrong when the server simply never answered sends them off resetting a password
      // that was fine all along.
      setError(
        err?.response
          ? 'Invalid email or password.'
          : 'Could not reach the server. It may still be starting up — please try again.',
      );
    }
  }

  async function handleGoogle(credential: string) {
    setError(null);
    try {
      // `true` here is not the consent itself — an existing account already gave it at
      // registration, and the server refuses to create a new one without it having been
      // collected. A first-time Google user is sent to /register to tick the box properly.
      await loginWithGoogle(credential, false);
      navigate('/dashboard');
    } catch (err: any) {
      const status = err?.response?.status;
      setError(
        status === 400
          ? 'No account yet for that Google address. Create one first — it takes a moment and you will need to accept the terms.'
          : status
            ? 'Could not sign in with that Google account.'
            : 'Could not reach the server. It may still be starting up — please try again.',
      );
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-cream px-4 page-fade-in">
      <div className="fixed top-4 right-4"><ThemeToggleButton size="medium" /></div>
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="GrowTH" className="h-24 w-auto object-contain mb-3" />
          <h1 className="text-xl font-semibold text-brand-700">Welcome back</h1>
          <p className="text-sm text-gray-500">Log in to track your child's growth</p>
        </div>
        <ColdStartNotice active={isSubmitting} />
        {error && <Alert severity="error" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField
            label="Email"
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Link to="/forgot-password" className="text-xs text-brand-600 self-end">
            Forgot password?
          </Link>
          <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ py: 1.2 }}>
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Existing accounts have already accepted the terms, so nothing is gated here — that
            only applies when Google sign-in creates a new account, which the server enforces. */}
        <GoogleSignInButton text="signin_with" onCredential={handleGoogle} />

        <p className="text-sm text-gray-500 text-center mt-6">
          New here?{' '}
          <Link to="/register" className="text-brand-600 font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
