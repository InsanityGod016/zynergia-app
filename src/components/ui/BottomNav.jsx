import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { Users, Megaphone, CheckSquare, TrendingUp, Network } from 'lucide-react';

const navItems = [
  { icon: Users, page: 'Contacts', label: 'Contactos' },
  { icon: Megaphone, page: 'Marketing', label: 'Marketing' },
  { icon: CheckSquare, page: 'Tasks', label: 'Tareas' },
  { icon: TrendingUp, page: 'Sales', label: 'Ventas' },
  { icon: Network, page: 'Partners', label: 'Partners' },
];

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list(),
    refetchInterval: 60000
  });

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayTaskCount = tasks.filter(t => !t.completed && t.due_date <= todayStr).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#F1F5F9] z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map(({ icon: Icon, page, label }) => {
          const isActive = currentPath === createPageUrl(page) ||
            (currentPath === '/' && page === 'Tasks');
          const badgeCount = page === 'Tasks' ? todayTaskCount : 0;

          return (
            <Link
              key={label}
              to={createPageUrl(page)}
              className="relative flex flex-col items-center justify-center gap-1 py-2 px-3"
            >
              <div className={`relative w-10 h-7 flex items-center justify-center rounded-full transition-all ${isActive ? 'bg-[#EEF2FF]' : ''}`}>
                <Icon
                  className={`w-5 h-5 transition-colors ${isActive ? 'text-[#004AFE]' : 'text-[#94A3B8]'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-[#004AFE]' : 'text-[#94A3B8]'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}