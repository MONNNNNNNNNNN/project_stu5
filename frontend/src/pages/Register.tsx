import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, TextField, Alert, FormControlLabel, Checkbox, FormHelperText } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { ColdStartNotice } from '../components/ColdStartNotice';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../lib/passwordRules';

const schema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
  acceptedTerms: z.boolean().refine((v) => v === true, 'You must accept the terms and privacy notice'),
});
type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { acceptedTerms: false } });

  // FR-2 is enforced server-side too — this only stops the parent getting as far as Google's
  // consent screen before being refused.
  const termsAccepted = watch('acceptedTerms');

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await registerUser(values.email, values.password, values.fullName, undefined, values.acceptedTerms);
      navigate('/children/new');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          (err?.response
            ? 'Could not create account.'
            : 'Could not reach the server. It may still be starting up — please try again.'),
      );
    }
  }

  async function handleGoogle(credential: string) {
    setError(null);
    try {
      await loginWithGoogle(credential, true);
      navigate('/children/new');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          (err?.response
            ? 'Could not create an account with that Google sign-in.'
            : 'Could not reach the server. It may still be starting up — please try again.'),
      );
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-cream px-4 page-fade-in">
      <div className="fixed top-4 right-4"><ThemeToggleButton size="medium" /></div>
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm p-8">
        <Button
          onClick={() => navigate(-1)}
          size="small"
          startIcon={<ArrowBackIcon fontSize="small" />}
          sx={{ textTransform: 'none', ml: -1, mb: 1 }}
        >
          Back
        </Button>
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="GrowTH" className="h-24 w-auto object-contain mb-3" />
          <h1 className="text-xl font-semibold text-brand-700">Create your account</h1>
          <p className="text-sm text-gray-500">Start tracking your child's growth journey</p>
        </div>
        <ColdStartNotice active={isSubmitting} />
        {error && <Alert severity="error" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField
            label="Full name"
            fullWidth
            {...register('fullName')}
            error={!!errors.fullName}
            helperText={errors.fullName?.message}
          />
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
            helperText={errors.password?.message ?? 'At least 8 characters, with a letter and a number'}
          />
          <div>
            <Controller
              name="acceptedTerms"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={
                    <span className="text-sm">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" className="text-brand-600 underline">
                        terms of use
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" target="_blank" className="text-brand-600 underline">
                        privacy notice
                      </Link>
                      , and I am the child's parent or guardian.
                    </span>
                  }
                />
              )}
            />
            {errors.acceptedTerms && (
              <FormHelperText error>{errors.acceptedTerms.message}</FormHelperText>
            )}
          </div>
          <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ py: 1.2 }}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <GoogleSignInButton
          label="Sign up with Google"
          onCredential={handleGoogle}
          disabled={!termsAccepted}
          disabledReason={termsAccepted ? undefined : 'Tick the box above first'}
        />
        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
