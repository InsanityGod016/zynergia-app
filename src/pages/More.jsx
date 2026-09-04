import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Copy,
  FileText,
  HelpCircle,
  LogOut,
  Package,
  QrCode,
  Settings,
  Share2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import MainHeader from '@/components/ui/MainHeader';
import LinkLeaderSheet from '@/components/partners/LinkLeaderSheet';

const toolItems = [
  { icon: FileText, label: 'Plantillas', page: 'Templates' },
  { icon: Package, label: 'Productos', page: 'Products' },
  { icon: QrCode, label: 'Códigos QR', page: 'QRGenerator' },
];

const accountItems = [
  {
    icon: Settings,
    title: 'Perfil y preferencias',
    description: 'Tus datos, moneda y notificaciones',
    page: 'Settings',
  },
  {
    icon: ShieldCheck,
    title: 'Suscripción y privacidad',
    description: 'Estado, cancelación y eliminación de cuenta',
    page: 'Settings',
  },
  {
    icon: HelpCircle,
    title: 'Ayuda y soporte',
    description: 'Resuelve una duda o contáctanos',
    page: 'Help',
  },
];

export default function More() {
  const { logout } = useAuth();
  const [leaderSheetOpen, setLeaderSheetOpen] = useState(false);
  const {
    data: settingsList = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const rows = await db.Settings.list();
      if (!rows[0] || rows[0].partner_code) return rows;
      const { error } = await supabase.rpc('ensure_partner_code');
      if (error) throw error;
      return db.Settings.list();
    },
  });

  const partnerCode = settingsList[0]?.partner_code || '';
  const linkedToLeader = Boolean(settingsList[0]?.parent_id);
  const invitation = partnerCode
    ? `Únete a mi equipo en Zynergia. Usa mi código: ${partnerCode}`
    : '';

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error('No se pudo copiar. Mantén presionado el código para seleccionarlo.');
      return false;
    }
  };

  const handleShareCode = async () => {
    if (!partnerCode) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mi código de Zynergia', text: invitation });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await copyText(invitation, 'Invitación copiada');
  };

  return (
    <div className="px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <MainHeader title="Cuenta" />

      <section aria-labelledby="partner-code-title" className="mb-7 rounded-3xl border border-primary/15 bg-card p-5 shadow-card">
        <h2 id="partner-code-title" className="text-lg font-bold text-foreground">Tu código de partner</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Compártelo para agregar personas a tu equipo.
        </p>

        {isLoading && <p className="mt-4 text-base text-muted-foreground" role="status">Cargando tu código…</p>}

        {isError && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4" role="alert">
            <p className="text-[15px] text-red-800">No pudimos cargar tu código.</p>
            <button type="button" onClick={() => refetch()} className="mt-2 min-h-12 rounded-xl px-3 text-base font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Intentar de nuevo
            </button>
          </div>
        )}

        {!isLoading && !isError && partnerCode && (
          <>
            <p className="my-4 select-all rounded-2xl bg-primary/10 px-4 py-4 text-center text-[28px] font-bold tracking-[0.18em] text-primary [overflow-wrap:anywhere]" aria-label={`Código ${partnerCode}`}>
              {partnerCode}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => copyText(partnerCode, 'Código copiado')} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-muted px-3 text-base font-bold text-foreground outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary">
                <Copy className="h-5 w-5" aria-hidden="true" />
                Copiar
              </button>
              <button type="button" onClick={handleShareCode} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-base font-bold text-primary-foreground outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary">
                <Share2 className="h-5 w-5" aria-hidden="true" />
                Compartir
              </button>
            </div>
          </>
        )}

        {!isLoading && !isError && !partnerCode && (
          <div className="mt-4 rounded-2xl bg-muted p-4">
            <p className="text-[15px] leading-relaxed text-muted-foreground">Completa tu perfil para preparar tu código.</p>
            <Link to={createPageUrl('Settings')} className="mt-2 inline-flex min-h-12 items-center text-base font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Completar perfil
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="leader-link-title" className="mb-7 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 id="leader-link-title" className="text-lg font-bold text-foreground">Tu líder</h2>
        {linkedToLeader ? (
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Ya estás vinculada con tu líder. Para cambiar esa relación, escribe a soporte.</p>
        ) : (
          <>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">Si alguien te invitó, agrega su código para aparecer automáticamente como partner en su equipo.</p>
            <button type="button" onClick={() => setLeaderSheetOpen(true)} disabled={isLoading || isError} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-[16px] font-bold text-primary-foreground outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              Agregar código de líder
            </button>
          </>
        )}
      </section>

      <section aria-labelledby="tools-title" className="mb-7">
        <h2 id="tools-title" className="mb-3 text-lg font-bold text-foreground">Herramientas</h2>
        <div className="grid grid-cols-3 gap-3">
          {toolItems.map(({ icon: Icon, label, page }) => (
            <Link
              key={page}
              to={createPageUrl(page)}
              className="flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-[15px] font-bold leading-tight text-foreground shadow-card outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <LinkLeaderSheet open={leaderSheetOpen} onOpenChange={setLeaderSheetOpen} />

      <section aria-labelledby="account-options-title">
        <h2 id="account-options-title" className="mb-3 text-lg font-bold text-foreground">Mi cuenta</h2>
        <div className="space-y-3">
          {accountItems.map(({ icon: Icon, title, description, page }) => (
            <Link
              key={title}
              to={createPageUrl(page)}
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card p-4 outline-none active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-foreground">{title}</span>
                <span className="mt-0.5 block text-[15px] leading-relaxed text-muted-foreground">{description}</span>
              </span>
            </Link>
          ))}

          <button
            type="button"
            onClick={logout}
            className="flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 text-left text-base font-semibold text-destructive outline-none active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <LogOut className="h-6 w-6" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}
