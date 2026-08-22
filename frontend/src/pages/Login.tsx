import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, TextField, Alert, Checkbox, FormControlLabel } from '@mui/material';
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
  /** Held between "no account yet" and the parent accepting the terms. */
  const [pendingCredential, setPendingCredential] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  /**
   * Google sign-in that can also create the account.
   *
   * The first attempt deliberately sends acceptedTerms: false. An existing account signs
   * straight in; a new one is refused by the server, and that refusal is the signal to ask for
   * consent rather than an error to show. FR-2 stays enforced server-side either way — the
   * consent panel below cannot be skipped by calling the API directly.
   */
  async function submitGoogle(credential: string, acceptedTerms: boolean) {
    setGoogleBusy(true);
    setError(null);
    try {
      await loginWithGoogle(credential, acceptedTerms);
      navigate('/dashboard');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 && !acceptedTerms) {
        // No account yet. Keep the credential and ask them to accept the terms.
        setPendingCredential(credential);
        return;
      }
      setPendingCredential(null);
      setError(
        status
          ? err?.response?.data?.message ?? 'Could not sign in with that Google account.'
          : 'Could not reach the server. It may still be starting up — please try again.',
      );
    } finally {
      setGoogleBusy(false);
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

        {pendingCredential ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 dark:bg-transparent p-4 flex flex-col gap-3">
            <p className="text-sm text-ink">
              You do not have an account yet. Accept the terms and we will create one from your
              Google address.
            </p>
            <FormControlLabel
              sx={{ ml: 0, alignItems: 'flex-start' }}
              control={
                <Checkbox
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  sx={{ pt: 0 }}
                />
              }
              label={
                <span className="text-xs text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" className="text-brand-600 underline underline-offset-2">
                    terms of use
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-brand-600 underline underline-offset-2">
                    privacy notice
                  </Link>
                  , and I am the child's parent or guardian.
                </span>
              }
            />
            <div className="flex gap-2">
              <Button
                variant="contained"
                disabled={!termsChecked || googleBusy}
                onClick={() => submitGoogle(pendingCredential, true)}
                sx={{ flex: 1 }}
              >
                {googleBusy ? 'Creating account…' : 'Create my account'}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setPendingCredential(null);
                  setTermsChecked(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <GoogleSignInButton
            label="Continue with Google"
            busy={googleBusy}
            onCredential={(c) => submitGoogle(c, false)}
          />
        )}

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
