import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'HOME' },
  { to: '/about', label: 'ABOUT' },
  { to: '/contact', label: 'CONTACT' },
];

export function PublicHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-brand-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center shrink-0">
            {/* Horizontal lockup — see the Logo component in AppShell for why. */}
            <img src="/logo-horizontal.png" alt="GrowTH" className="h-14 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `text-xs font-mono font-semibold tracking-widest transition-colors duration-150 pb-1 ${isActive ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-500 hover:text-brand-500'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ borderRadius: 999 }}>
              Dashboard
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => navigate('/login')} sx={{ borderRadius: 999 }}>
              Login / Sign Up
            </Button>
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
