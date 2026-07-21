import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Badge, IconButton, Avatar, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import FlagIcon from '@mui/icons-material/FlagOutlined';
import HealthIcon from '@mui/icons-material/MonitorHeartOutlined';
import ResourcesIcon from '@mui/icons-material/MenuBookOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Notification } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

const desktopNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/children', label: 'Children' },
  { to: '/growth', label: 'Growth Tracking' },
  { to: '/puberty', label: 'Puberty Screening' },
  { to: '/bone-age', label: 'Bone Age AI' },
  { to: '/learn', label: 'Learn' },
];

const mobileNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/milestones', label: 'Milestones', icon: FlagIcon },
  { to: '/growth', label: 'Health Logs', icon: HealthIcon },
  { to: '/learn', label: 'Resources', icon: ResourcesIcon },
];

function AccountMenu({ size }: { size: number }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  async function handleLogout() {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  }

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Avatar sx={{ width: size, height: size, bgcolor: '#87a480', fontSize: size * 0.45 }}>
          {user?.fullName?.[0]?.toUpperCase()}
        </Avatar>
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
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/children');
          }}
        >
          <ListItemIcon>
            <GroupOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Children
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

export function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
    enabled: !!user,
  });
  const unread = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-brand-100 bg-surface sticky top-0 z-20">
        <div className="flex items-center gap-10">
          <NavLink to="/dashboard" className="shrink-0 transition-transform hover:scale-105 active:scale-95">
            <img src="/logo.png" alt="GrowTH — go to dashboard" className="h-12 w-12 rounded-2xl object-contain bg-white p-1.5 ring-1 ring-brand-100" />
          </NavLink>
          <nav className="flex items-center gap-6">
            {desktopNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors duration-150 ${isActive ? 'text-brand-700' : 'text-gray-500 hover:text-brand-600'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <IconButton size="small" onClick={() => navigate('/notifications')}>
            <Badge badgeContent={unread} color="error">
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
          <AccountMenu size={32} />
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-surface border-b border-brand-100 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <NavLink to="/dashboard" className="shrink-0 transition-transform active:scale-95">
            <img src="/logo.png" alt="GrowTH — go to dashboard" className="h-11 w-11 rounded-2xl object-contain bg-white p-1 ring-1 ring-brand-100" />
          </NavLink>
          <p className="text-xs text-gray-500 leading-tight">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <IconButton size="small" onClick={() => navigate('/notifications')}>
            <Badge badgeContent={unread} color="error">
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
          <AccountMenu size={28} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden bg-surface border-t border-brand-100 flex items-center justify-around py-2 z-20">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[11px] transition-colors duration-150 active:scale-95 ${isActive ? 'text-brand-700' : 'text-gray-400'}`
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
