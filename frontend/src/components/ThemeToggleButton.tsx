import { IconButton } from '@mui/material';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useThemeMode } from '../context/ThemeModeContext';

export function ThemeToggleButton({ size = 'small' as const }: { size?: 'small' | 'medium' }) {
  const { mode, toggle } = useThemeMode();
  return (
    <IconButton size={size} onClick={toggle} aria-label="Toggle dark mode">
      {mode === 'dark' ? <LightModeOutlinedIcon fontSize={size} /> : <DarkModeOutlinedIcon fontSize={size} />}
    </IconButton>
  );
}
