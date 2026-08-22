import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Avatar, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import FlagIcon from '@mui/icons-material/FlagOutlined';
import HealthIcon from '@mui/icons-material/MonitorHeartOutlined';
import ResourcesIcon from '@mui/icons-material/MenuBookOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { ownAvatarPath, useAuthedImage } from '../lib/useAuthedImage';
import { avatarSx } from '../lib/chartTheme';
import { useThemeMode } from '../context/ThemeModeContext';
import { ThemeToggleButton } from './ThemeToggleButton';
import { Footer } from './Footer';
import { NotificationsMenu } from './NotificationsMenu';

const childNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/growth', label: 'Growth' },
  { to: '/puberty', label: 'Puberty' },
  { to: '/bone-age', label: 'AI Prediction' },
];

const globalNavItems = [
  { to: '/learn', label: 'Resources' },
  { to: '/contact', label: 'Contact' },
];

const mobileNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/growth', label: 'Growth', icon: HealthIcon },
  { to: '/puberty', label: 'Puberty', icon: FlagIcon },
  { to: '/learn', label: 'Resources', icon: ResourcesIcon },
];

function AccountMenu({ avatarSize }: { avatarSize: number }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const avatarSrc = useAuthedImage(ownAvatarPath(user?.avatarUrl));
  const { mode } = useThemeMode();

  async function handleLogout() {
    setAnchorEl(null);
    await logout();
    navigate('/');
  }

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ gap: 0.5, borderRadius: 999 }}
        aria-label="Account menu"
      >
        <Avatar
          src={avatarSrc ?? undefined}
          sx={{ width: avatarSize, height: avatarSize, ...avatarSx(mode), fontSize: avatarSize * 0.42 }}
        >
          {user?.fullName?.[0]?.toUpperCase()}
        </Avatar>
        <ExpandMoreIcon fontSize="small" className="text-gray-500" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/profile');
          }}
        >
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        {/* ChildList was implemented and routed but nothing anywhere linked to it, so the only
            way in was to type the URL. Adding, editing and removing a child were each reachable
            from other screens, which is probably why the page going missing was never noticed. */}
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/children');
          }}
        >
          <ListItemIcon>
            <FamilyRestroomOutlinedIcon fontSize="small" />
          </ListItemIcon>
          My children
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/settings');
          }}
        >
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}

function Logo({ imgClass }: { imgClass: string }) {
  return (
    <NavLink to="/dashboard" className="shrink-0 flex items-center transition-transform hover:scale-[1.02] active:scale-95">
      {/* The horizontal lockup, not the stacked logo.png: stacked art is ~3:1 tall, so
          fitting it into a nav bar shrank "GrowTH" to about 15px and made it unreadable.
          Side by side, the wordmark gets roughly half the bar's height instead. */}
      <img src="/logo-horizontal.png" alt="GrowTH" className={`${imgClass} w-auto object-contain`} />
    </NavLink>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-svh bg-cream flex flex-col">
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-8 py-3 border-b border-brand-100 bg-surface sticky top-0 z-20">
        <div className="flex items-center gap-10">
          <Logo imgClass="h-16" />
          <nav className="flex items-center gap-5">
            {childNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[15px] font-semibold transition-colors duration-150 pb-1 ${isActive ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-500 hover:text-brand-500'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <span className="w-px h-5 bg-brand-100" />
            {globalNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[15px] font-semibold transition-colors duration-150 pb-1 ${isActive ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-500 hover:text-brand-500'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <NotificationsMenu />
          <AccountMenu avatarSize={40} />
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="flex md:hidden items-center justify-between px-4 py-2.5 bg-surface border-b border-brand-100 sticky top-0 z-20">
        <Logo imgClass="h-14" />
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <NotificationsMenu size="small" />
          <AccountMenu avatarSize={36} />
        </div>
      </header>

      {/* Bottom padding clears the fixed mobile nav *and* the iPhone home indicator —
          without the safe-area term the last card sits under the nav on a notched device. */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10 flex-1">
        <div key={location.pathname} className="">
          {children}
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 md:hidden bg-surface border-t border-brand-100 flex items-center justify-around py-2 z-20"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[11px] transition-colors duration-150 active:scale-95 ${isActive ? 'text-brand-500' : 'text-gray-500'}`
            }
          >
            <item.icon fontSize="small" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppShell() {
  return (
    <AppChrome>
      <Outlet />
    </AppChrome>
  );
}
