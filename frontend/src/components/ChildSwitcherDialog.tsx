import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemAvatar, ListItemText, Button, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useChildren } from '../context/ChildContext';
import { ChildAvatar } from './ChildAvatar';

function age(dateOfBirth: string) {
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years < 1 ? `${Math.floor(years * 12)} months` : `${Math.floor(years)} years`;
}

export function ChildSwitcherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { children, selectedChildId, selectChild } = useChildren();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle className="font-heading">Switch child</DialogTitle>
      <DialogContent sx={{ px: 1 }}>
        <List>
          {children.map((child) => (
            <ListItemButton
              key={child.id}
              selected={child.id === selectedChildId}
              onClick={() => {
                selectChild(child.id);
                onClose();
              }}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemAvatar>
                <ChildAvatar avatarUrl={child.avatarUrl} fallbackLetter={child.fullName[0]?.toUpperCase() ?? '?'} size={40} />
              </ListItemAvatar>
              <ListItemText primary={child.nickname || child.fullName} secondary={`${age(child.dateOfBirth)} old`} />
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Button
          fullWidth
          startIcon={<AddIcon />}
          onClick={() => {
            onClose();
            navigate('/children/new');
          }}
          sx={{ justifyContent: 'flex-start', px: 2 }}
        >
          Add another child
        </Button>
      </DialogContent>
    </Dialog>
  );
}
