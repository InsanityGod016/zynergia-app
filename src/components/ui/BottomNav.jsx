import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { CalendarCheck, Users, ReceiptText, Network, UserRound } from 'lucide-react';

const navItems = [
  { icon: CalendarCheck, page: 'Tasks', label: 'Hoy' },
  { icon: Users, page: 'Contacts', label: 'Contactos' },
  { icon: ReceiptText, page: 'Sales', label: 'Ventas' },
  { icon: Network, page: 'Partners', label: 'Equipo' },
  { icon: UserRound, page: 'More', label: 'Cuenta' },
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
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 shadow-nav backdrop-blur-xl"
    >
      <div className="mx-auto grid h-[72px] max-w-lg grid-cols-5 px-0 sm:px-2">
        {navItems.map(({ icon: Icon, page, label }) => {
          const isActive = currentPath === createPageUrl(page) ||
            (page === 'Tasks' && currentPath === '/') ||
            (page === 'More' && currentPath === createPageUrl('Marketing'));
          const badgeCount = page === 'Tasks' ? todayTaskCount : 0;

          return (
            <Link
              key={label}
              to={createPageUrl(page)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={badgeCount > 0 ? `${label}, ${badgeCount} pendientes` : label}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[15px] font-semibold tracking-[-0.04em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative flex h-8 w-11 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                {badgeCount > 0 && (
                  <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-[15px] font-bold leading-none tracking-normal text-destructive-foreground">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
