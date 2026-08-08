import { createTheme, type PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#2dd4bf' : '#00685f' },
      secondary: { main: mode === 'dark' ? '#3cddc7' : '#006b5f' },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8f9ff',
        paper: mode === 'dark' ? '#16213a' : '#ffffff',
      },
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
      h1: { fontFamily: "'Manrope', 'Inter', sans-serif" },
      h2: { fontFamily: "'Manrope', 'Inter', sans-serif" },
      h3: { fontFamily: "'Manrope', 'Inter', sans-serif" },
      h4: { fontFamily: "'Manrope', 'Inter', sans-serif" },
      h5: { fontFamily: "'Manrope', 'Inter', sans-serif" },
      h6: { fontFamily: "'Manrope', 'Inter', sans-serif" },
      button: { fontWeight: 700, textTransform: 'none' },
    },
  });
}
