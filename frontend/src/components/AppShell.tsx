import { NavLink, Outlet } from 'react-router-dom';
import { Badge, IconButton, Avatar } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import FlagIcon from '@mui/icons-material/FlagOutlined';
import HealthIcon from '@mui/icons-material/MonitorHeartOutlined';
import ResourcesIcon from '@mui/icons-material/MenuBookOutlined';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Notification } from '../types';

const desktopNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
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

export function AppShell() {
  const { user } = useAuth();
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
    enabled: !!user,
  });
  const unread = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-brand-100 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="GrowTH" className="h-9 w-9 rounded-full object-cover" />
            <span className="font-semibold text-lg text-brand-700">GrowTH</span>
          </div>
          <nav className="flex items-center gap-6">
            {desktopNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-brand-700' : 'text-gray-500 hover:text-brand-600'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <IconButton size="small">
            <Badge badgeContent={unread} color="error">
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#87a480' }}>
            {user?.fullName?.[0]?.toUpperCase()}
          </Avatar>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-brand-100 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="GrowTH" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-sm leading-tight text-brand-700">GrowTH</p>
            <p className="text-xs text-gray-500 leading-tight">Welcome back, {user?.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton size="small">
            <Badge badgeContent={unread} color="error">
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
          <Avatar sx={{ width: 28, height: 28, bgcolor: '#87a480' }}>
            {user?.fullName?.[0]?.toUpperCase()}
          </Avatar>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-brand-100 flex items-center justify-around py-2 z-20">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[11px] ${isActive ? 'text-brand-700' : 'text-gray-400'}`
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
