import { createTheme, type PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#5fa495' : '#46897a' },
      secondary: { main: '#87a480' },
      background: {
        default: mode === 'dark' ? '#14181a' : '#faf9f6',
        paper: mode === 'dark' ? '#1f2528' : '#ffffff',
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
    },
  });
}
