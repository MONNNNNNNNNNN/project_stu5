import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, TextField, ToggleButton, ToggleButtonGroup, Alert, MenuItem } from '@mui/material';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';
import { CHILD_AVATAR_PRESETS } from '../lib/childAvatars';

type Relation = 'PARENT' | 'GUARDIAN' | 'RELATIVE';

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
  const [relation, setRelation] = useState<Relation>('PARENT');
  const [avatarKey, setAvatarKey] = useState<string>(CHILD_AVATAR_PRESETS[0].id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    const existing = children.find((c) => c.id === id);
    if (existing) {
      setFullName(existing.fullName);
      setNickname(existing.nickname ?? '');
      setSex(existing.sex);
      setDateOfBirth(existing.dateOfBirth.slice(0, 10));
      if (existing.avatarUrl) setAvatarKey(existing.avatarUrl);
    }
  }, [isEdit, id, children]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { fullName, nickname: nickname || undefined, sex, dateOfBirth, relation, avatarUrl: avatarKey };
      return isEdit
        ? (await api.patch(`/children/${id}`, payload)).data
        : (await api.post('/children', payload)).data;
    },
    onSuccess: async (child) => {
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      selectChild(child.id);
      navigate('/dashboard');
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
        <div>
          <p className="text-sm font-medium text-ink mb-1">Choose an avatar</p>
          <p className="text-xs text-gray-500 mb-2">
            For your child's privacy, profiles use a picked character instead of a real photo.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {CHILD_AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAvatarKey(preset.id)}
                className={`aspect-square rounded-full overflow-hidden transition-all ${
                  avatarKey === preset.id ? 'ring-2 ring-brand-500 ring-offset-2' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset.bg }}
                aria-label={preset.id}
              >
                <img
                  src={preset.src}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '50% 15%', transform: 'scale(1.35)', transformOrigin: '50% 20%' }}
                />
              </button>
            ))}
          </div>
        </div>
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
        <TextField
          select
          label="Your relationship to this child"
          fullWidth
          value={relation}
          onChange={(e) => setRelation(e.target.value as Relation)}
        >
          <MenuItem value="PARENT">Parent</MenuItem>
          <MenuItem value="GUARDIAN">Guardian</MenuItem>
          <MenuItem value="RELATIVE">Relative</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ py: 1.2 }}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Save and continue'}
        </Button>
      </form>
    </div>
  );
}
