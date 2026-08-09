import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, setAccessToken } from '../lib/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    acceptedTerms: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function bootstrap() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.post('/auth/refresh', { refreshToken });
      setAccessToken(res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
    } catch {
      // Refresh tokens rotate server-side, so a second concurrent bootstrap (two tabs sharing
      // localStorage, or a dev double-mount) can lose the race and 401 on an already-used
      // token. Only clear it if it's still the one we attempted — otherwise a winning call
      // already rotated it, and clearing here would wipe out a perfectly valid session.
      if (localStorage.getItem('refreshToken') === refreshToken) {
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  }

  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applySession(data: { user: User; accessToken: string; refreshToken: string }) {
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    await applySession(res.data);
  }

  async function register(
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    acceptedTerms: boolean,
  ) {
    const res = await api.post('/auth/register', { email, password, fullName, phoneNumber, acceptedTerms });
    await applySession(res.data);
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
