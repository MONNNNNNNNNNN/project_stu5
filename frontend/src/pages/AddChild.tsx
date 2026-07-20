import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';

export default function AddChild() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectChild } = useChildren();
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('FEMALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post('/children', { fullName, nickname: nickname || undefined, sex, dateOfBirth })).data,
    onSuccess: async (child) => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      selectChild(child.id);
      navigate('/dashboard');
    },
    onError: () => setError('Could not add child. Check the form and try again.'),
  });

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8 mt-6">
      <h1 className="text-xl font-semibold text-brand-700 mb-1">Add your child</h1>
      <p className="text-sm text-gray-500 mb-6">
        We'll use this to personalize growth tracking and charts.
      </p>
      {error && <Alert severity="error" className="mb-4">{error}</Alert>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <TextField label="Full name" required fullWidth value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Nickname (optional)" fullWidth value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <TextField
          label="Date of birth"
          type="date"
          required
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
        <ToggleButtonGroup
          value={sex}
          exclusive
          onChange={(_e, val) => val && setSex(val)}
          fullWidth
          color="primary"
        >
          <ToggleButton value="FEMALE">Girl</ToggleButton>
          <ToggleButton value="MALE">Boy</ToggleButton>
        </ToggleButtonGroup>
        <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ py: 1.2 }}>
          {mutation.isPending ? 'Saving…' : 'Save and continue'}
        </Button>
      </form>
    </div>
  );
}
