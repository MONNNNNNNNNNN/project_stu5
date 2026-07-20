import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';

export default function AddChild() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const { selectChild, children } = useChildren();
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('FEMALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    const existing = children.find((c) => c.id === id);
    if (existing) {
      setFullName(existing.fullName);
      setNickname(existing.nickname ?? '');
      setSex(existing.sex);
      setDateOfBirth(existing.dateOfBirth.slice(0, 10));
    }
  }, [isEdit, id, children]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { fullName, nickname: nickname || undefined, sex, dateOfBirth };
      return isEdit
        ? (await api.patch(`/children/${id}`, payload)).data
        : (await api.post('/children', payload)).data;
    },
    onSuccess: async (child) => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      selectChild(child.id);
      navigate(isEdit ? '/children' : '/dashboard');
    },
    onError: () => setError('Could not save child. Check the form and try again.'),
  });

  return (
    <div className="max-w-md mx-auto bg-surface rounded-2xl shadow-sm p-8 mt-6">
      <h1 className="text-xl font-semibold text-brand-700 mb-1">{isEdit ? 'Edit child' : 'Add your child'}</h1>
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
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Save and continue'}
        </Button>
      </form>
    </div>
  );
}
