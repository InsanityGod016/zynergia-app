import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ChevronLeft, Bell, CheckCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_COLORS = {
  info:    { bar: '#004AFE', bg: '#EEF2FF' },
  warning: { bar: '#F59E0B', bg: '#FFFBEB' },
  danger:  { bar: '#EF4444', bg: '#FEF2F2' },
  success: { bar: '#22C55E', bg: '#F0FDF4' },
};

const ENTITY_ROUTES = {
  task:      'Tasks',
  partner:   'Partners',
  dashboard: 'Partners',
  contact:   'Contacts',
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => db.Notification.list('-created_date', 100)
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => db.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => db.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const handleTap = (notif) => {
    if (!notif.is_read) markReadMutation.mutate(notif.id);
    if (notif.related_entity_type) {
      navigate(createPageUrl(ENTITY_ROUTES[notif.related_entity_type] || 'Tasks'));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="px-5 pt-8 pb-8 min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#0F172A]">Notificaciones</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center gap-1.5 text-[13px] text-[#004AFE] font-medium px-3 py-1.5 rounded-full hover:bg-[#EEF2FF] transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Leer todas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center">
            <Bell className="w-8 h-8 text-[#94A3B8]" strokeWidth={1.5} />
          </div>
          <p className="text-[16px] font-medium text-[#0F172A]">Sin notificaciones</p>
          <p className="text-[14px] text-[#64748B] text-center">Cuando tengas notificaciones, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const colors = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
            const timeAgo = notif.created_date
              ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true, locale: es })
              : '';
            return (
              <button
                key={notif.id}
                onClick={() => handleTap(notif)}
                className="w-full text-left flex items-stretch rounded-2xl overflow-hidden transition-colors active:opacity-70"
                style={{ backgroundColor: notif.is_read ? '#F8FAFC' : colors.bg }}
              >
                {/* Color bar */}
                <div className="w-1 flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                <div className="flex-1 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[14px] leading-snug ${notif.is_read ? 'font-medium text-[#64748B]' : 'font-semibold text-[#0F172A]'}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#004AFE] flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-[13px] text-[#64748B] mt-0.5 leading-snug">{notif.body}</p>
                  {timeAgo && (
                    <p className="text-[11px] text-[#94A3B8] mt-1.5">{timeAgo}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}