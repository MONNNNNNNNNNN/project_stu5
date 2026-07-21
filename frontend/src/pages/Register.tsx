import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, TextField, Alert, FormControlLabel, Checkbox, FormHelperText } from '@mui/material';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z
    .string()
    .min(9, 'Enter a valid phone number')
    .regex(/^[0-9+\-\s()]{9,15}$/, 'Enter a valid phone number'),
  acceptedTerms: z.boolean().refine((v) => v === true, 'You must accept the terms and privacy notice'),
});
type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { acceptedTerms: false } });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await registerUser(values.email, values.password, values.fullName, values.phoneNumber, values.acceptedTerms);
      navigate('/children/new');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not create account.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="fixed top-4 right-4"><ThemeToggleButton size="medium" /></div>
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="GrowTH" className="h-24 w-24 rounded-full object-contain bg-white p-1.5 ring-1 ring-brand-100 mb-3" />
          <h1 className="text-xl font-semibold text-brand-700">Create your account</h1>
          <p className="text-sm text-gray-500">Start tracking your child's growth journey</p>
        </div>
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
            label="Phone number"
            fullWidth
            {...register('phoneNumber')}
            error={!!errors.phoneNumber}
            helperText={errors.phoneNumber?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
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
                      I agree to the terms of use and{' '}
                      <Link to="/privacy" target="_blank" className="text-brand-600 underline">
                        privacy notice
                      </Link>
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
