import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../lib/api';
import { useChildren } from '../context/ChildContext';

function age(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const years = diff / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) return `${Math.floor(years * 12)} months`;
  return `${Math.floor(years)} years`;
}

export default function ChildList() {
  const { children, isLoading, selectedChildId, selectChild } = useChildren();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/children/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-brand-700">Your children</h1>
        <Button component={Link} to="/children/new" variant="contained" size="small">
          Add child
        </Button>
      </div>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="flex flex-col gap-3">
        {children.map((child) => (
          <div
            key={child.id}
            className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-4 hover:ring-2 hover:ring-brand-200"
          >
            <button
              onClick={() => {
                selectChild(child.id);
                navigate('/dashboard');
              }}
              className="flex items-center gap-4 flex-1 text-left"
            >
              <Avatar sx={{ bgcolor: '#87a480', width: 48, height: 48 }}>
                {child.fullName[0]?.toUpperCase()}
              </Avatar>
              <div>
                <p className="font-medium text-ink flex items-center gap-1">
                  {child.nickname || child.fullName}
                  {child.id === selectedChildId && (
                    <CheckCircleIcon fontSize="inherit" className="text-brand-500" />
                  )}
                </p>
                <p className="text-sm text-gray-500">{age(child.dateOfBirth)} old</p>
              </div>
            </button>
            <IconButton size="small" component={Link} to={`/children/${child.id}/edit`}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                if (confirm(`Remove ${child.nickname || child.fullName}?`)) deleteMutation.mutate(child.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        ))}
      </div>
      {!isLoading && children.length === 0 && (
        <p className="text-sm text-gray-500 mt-4">No children added yet.</p>
      )}
    </div>
  );
}
