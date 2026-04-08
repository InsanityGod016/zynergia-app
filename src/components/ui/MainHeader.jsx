import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { Menu, Bell } from 'lucide-react';
import SideDrawer from './SideDrawer';

export default function MainHeader({ title }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => db.Notification.list(),
    refetchInterval: 30000
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
        >
          <Menu className="w-6 h-6 text-[#0F172A]" strokeWidth={2} />
        </button>

        <h1 className="text-[20px] font-bold text-[#0F172A]">{title}</h1>

        <button
          onClick={() => navigate(createPageUrl('Notifications'))}
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
        >
          <Bell className="w-6 h-6 text-[#0F172A]" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <SideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}