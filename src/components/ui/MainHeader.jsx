import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { Bell } from 'lucide-react';

export default function MainHeader({ title }) {
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => db.Notification.list(),
    refetchInterval: 30000
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="mb-7 flex min-h-14 items-center gap-3">
      <h1 className="min-w-0 flex-1 truncate text-left text-2xl font-bold tracking-tight text-foreground">{title}</h1>

      <button
        type="button"
        onClick={() => navigate(createPageUrl('Notifications'))}
        className="relative flex h-14 min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[15px] font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={unreadCount > 0 ? `Avisos, ${unreadCount} sin leer` : 'Avisos'}
      >
        <Bell className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        <span>Avisos</span>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-[15px] font-bold leading-none text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
