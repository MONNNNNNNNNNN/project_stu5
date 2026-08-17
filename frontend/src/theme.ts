import { createTheme, type PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#2dd4bf' : '#00685f' },
      secondary: { main: mode === 'dark' ? '#3cddc7' : '#006b5f' },
      // Error red is used two opposite ways: as *text* on the page (the "Delete account"
      // outlined button) and as a *background* behind white (the notification badge). One
      // value cannot satisfy both on a dark surface — dark enough for white to read on it is
      // too dark to read against #16213a. So the palette carries the text-facing value, and
      // MuiBadge below pins its own background.
      error: { main: mode === 'dark' ? '#f87171' : '#c62828' },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8f9ff',
        paper: mode === 'dark' ? '#16213a' : '#ffffff',
      },
    },
    shape: { borderRadius: 16 },
    components: {
      MuiBadge: {
        styleOverrides: {
          // Fixed rather than palette-derived: white on #c62828 is 6.7:1 in both themes,
          // where MUI's default error red left the unread count at 3.68:1.
          badge: { backgroundColor: '#c62828', color: '#ffffff' },
        },
      },
    },
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
