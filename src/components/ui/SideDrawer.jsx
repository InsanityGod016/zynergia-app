import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { Settings, HelpCircle, LogOut, Copy, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const menuItems = [
  { icon: Wrench, label: 'Herramientas', page: 'Marketing' },
  { icon: Settings, label: 'Mi cuenta', page: 'Settings' },
  { icon: HelpCircle, label: 'Ayuda y soporte', page: 'Help' },
];

export default function SideDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.Settings.list(),
    enabled: isOpen,
  });

  const profile = settingsList[0] || {};
  const userName = profile.user_name || 'Mi perfil';
  const userPhoto = profile.user_photo || '';
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleNav = (page) => {
    onClose();
    navigate(createPageUrl(page));
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  const partnerCode = profile.partner_code || null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(partnerCode);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar. Mantén presionado el código para seleccionarlo.');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="flex w-[min(20rem,88vw)] flex-col gap-0 border-border bg-card p-0 [&>button]:hidden">
        <SheetTitle className="sr-only">Menú principal</SheetTitle>
            <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10">
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 items-center gap-1 rounded-2xl px-3 text-sm font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                Cerrar
              </button>
            </div>
            {/* Header with profile */}
            <div className="border-b border-border px-6 pb-5 pt-[calc(3.5rem+env(safe-area-inset-top))]">
              <div className="mb-4 flex min-h-12 items-center pr-12">
                <span className="text-xl font-bold text-foreground">Menú</span>
              </div>
              <button
                type="button"
                onClick={() => handleNav('Settings')}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  {userPhoto ? (
                    <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{userName}</p>
                  <p className="text-sm text-muted-foreground">Ver perfil</p>
                </div>
              </button>
            </div>

            {/* Código de partner */}
            {partnerCode && (
              <div className="border-b border-border px-6 py-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Tu código de socio</p>
                <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-2">
                  <span className="select-all text-[22px] font-bold tracking-[0.2em] text-primary">{partnerCode}</span>
                  <button type="button" onClick={handleCopyCode} className="flex h-12 items-center justify-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Copy className="h-5 w-5" aria-hidden="true" />
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 px-4 py-4 space-y-1">
              {menuItems.map(({ icon: Icon, label, page }) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => handleNav(page)}
                  className="flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 text-left text-base font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-border px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 text-base font-semibold text-destructive outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <LogOut className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
      </SheetContent>
    </Sheet>
  );
}
