import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthContext'
import { ChildProvider } from './context/ChildContext'
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext'
import { createAppTheme } from './theme'

function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode()
  const theme = useMemo(() => createAppTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider>
      <MuiThemeBridge>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <ChildProvider>
                <App />
              </ChildProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </MuiThemeBridge>
    </ThemeModeProvider>
  </StrictMode>,
)
