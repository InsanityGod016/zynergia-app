import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/api';
import {
  billingAccessEndsAt,
  cancellationEndsImmediately,
  cancelSubscription,
  getBillingStatus,
  notifyBillingChanged,
} from '@/lib/subscription';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CalendarDays, ChevronLeft, User, Phone, Globe, Bell, LogOut, Camera, HelpCircle, Check, Copy, Share2, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cancelZynergiaNotifications, notificationPermissionStatus, requestNotificationPermission } from '@/lib/localNotifications';

const CURRENCIES = [
  { value: 'MXN', label: 'MXN — Peso Mexicano' },
  { value: 'USD', label: 'USD — Dólar Americano' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'ARS', label: 'ARS — Peso Argentino' },
  { value: 'COP', label: 'COP — Peso Colombiano' },
  { value: 'CLP', label: 'CLP — Peso Chileno' },
  { value: 'PEN', label: 'PEN — Sol Peruano' },
  { value: 'BRL', label: 'BRL — Real Brasileño' },
];

const BILLING_LABELS = {
  none: 'Sin suscripción',
  incomplete: 'Pago pendiente',
  incomplete_expired: 'Pago vencido',
  trialing: 'Acceso activo',
  active: 'Acceso activo',
  grace: 'Pago pendiente',
  past_due: 'Pago pendiente',
  unpaid: 'Pago vencido',
  paused: 'Pago pausado',
  canceled: 'Suscripción cancelada',
  complimentary: 'Acceso de cortesía',
  pending_deletion: 'Eliminación programada',
  refunded: 'Pago reembolsado',
  disputed: 'Pago en disputa',
  manual_review: 'Cuenta en revisión',
  inactive: 'Sin acceso activo',
};

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const { logout, user } = useAuth();

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.Settings.list()
  });

  const settings = settingsList[0] || null;

  const {
    data: billingStatus,
    isLoading: billingIsLoading,
    isError: billingIsError,
    refetch: refetchBilling,
  } = useQuery({
    queryKey: ['billing-status'],
    queryFn: getBillingStatus,
    retry: 1,
  });

  const [form, setForm] = useState({
    user_name: '',
    user_phone: '',
    default_currency: 'MXN',
    notifications_enabled: false,
    user_photo: ''
  });

  const [photoPreview, setPhotoPreview] = useState('');
  const [saved, setSaved] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        user_name: settings.user_name || '',
        user_phone: settings.user_phone || '',
        default_currency: settings.default_currency || 'MXN',
        notifications_enabled: settings.notifications_enabled !== false,
        user_photo: settings.user_photo || ''
      });
      setPhotoPreview(settings.user_photo || '');
    }
  }, [settings?.id]);

  useEffect(() => {
    if (!settings?.id || settings.partner_code) return undefined;
    let active = true;
    supabase.rpc('ensure_partner_code').then(({ error }) => {
      if (error) throw error;
      if (active) queryClient.invalidateQueries({ queryKey: ['settings'] });
    }, () => {});
    return () => { active = false; };
  }, [queryClient, settings?.id, settings?.partner_code]);

  useEffect(() => {
    if (settings?.notifications_enabled !== true) return;
    notificationPermissionStatus().then(permission => {
      if (permission.display !== 'granted') {
        setForm(previous => ({ ...previous, notifications_enabled: false }));
      }
    }).catch(() => {});
  }, [settings?.notifications_enabled]);

  const saveMutation = useMutation({
    mutationFn: async (/** @type {{user_name: string, user_phone: string, default_currency: string, notifications_enabled: boolean, user_photo: string}} */ data) => {
      if (settings?.id) {
        return db.Settings.update(settings.id, data);
      }
      return db.Settings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      toast.success('Configuración guardada');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      toast.error('Error al guardar. Intenta de nuevo.');
    }
  });

  const toggleNotifMutation = useMutation({
    mutationFn: async (/** @type {boolean} */ enabled) => {
      if (settings?.id) return db.Settings.update(settings.id, { notifications_enabled: enabled });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
    onError: () => toast.error('No se pudo guardar la preferencia'),
  });

  const handleNotificationToggle = async () => {
    const next = !form.notifications_enabled;
    if (next) {
      const wantsPermission = window.confirm('Zynergia puede avisarte a quién dar seguimiento y por qué. ¿Quieres permitir estos recordatorios?');
      if (!wantsPermission) return;
      const permission = await requestNotificationPermission();
      if (permission.display !== 'granted') {
        toast.error('Los avisos siguen desactivados. Puedes habilitarlos en Ajustes del teléfono.');
        return;
      }
    } else {
      await cancelZynergiaNotifications();
    }
    setForm(previous => ({ ...previous, notifications_enabled: next }));
    toggleNotifMutation.mutate(next);
  };

  const cancelBillingMutation = useMutation({
    mutationFn: cancelSubscription,
    onMutate: () => setCancelError(''),
    onSuccess: (status) => {
      queryClient.setQueryData(['billing-status'], status);
      notifyBillingChanged(status);
      setCancelDialogOpen(false);
      toast.success(cancellationEndsImmediately(billingStatus)
        ? 'Suscripción cancelada. Se detuvieron los siguientes intentos de cobro.'
        : 'Renovación cancelada. Conservas el acceso hasta la fecha pagada.');
    },
    onError: (error) => {
      setCancelError(error.message || 'No pudimos cancelar la renovación. Intenta de nuevo.');
    },
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(settings?.partner_code || '');
    toast.success('Código copiado');
  };

  const handleShareCode = () => {
    const text = `Únete a mi equipo en Zynergia. Usa mi código al registrarte: ${settings?.partner_code}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Mensaje copiado');
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await imageToBase64(file);
      setPhotoPreview(base64);
      setForm(prev => ({ ...prev, user_photo: base64 }));
    } catch {
      toast.error('No se pudo cargar la imagen');
    }
  };

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const handleLogout = () => {
    logout();
  };

  const [deleteStep, setDeleteStep] = useState(0); // 0=oculto, 1=confirmar, 2=enviando, 3=programado
  const [deletePassword, setDeletePassword] = useState('');
  const [deletionDate, setDeletionDate] = useState(null);
  const handleDeleteAccount = async () => {
    setDeleteStep(2);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: deletePassword,
      });
      if (reauthError) throw new Error('La contraseña no es correcta.');

      const operationKey = `zynergia_delete_operation_${user?.id}`;
      const operationId = sessionStorage.getItem(operationKey) || crypto.randomUUID();
      sessionStorage.setItem(operationKey, operationId);
      const data = await apiFetch('/api/account/deletion-request', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE', operation_id: operationId }),
      });
      sessionStorage.removeItem(operationKey);
      setDeletePassword('');

      if (data.executeAt) {
        setDeletionDate(data.executeAt);
        setDeleteStep(3);
        await queryClient.invalidateQueries({ queryKey: ['billing-status'] });
        return;
      }

      Object.keys(localStorage).filter(key => key.startsWith('zynergia_')).forEach(key => localStorage.removeItem(key));
      await logout();
    } catch (err) {
      toast.error(err.message || 'No se pudo enviar la solicitud. Tus datos siguen intactos.');
      setDeleteStep(1);
    }
  };

  const initials = form.user_name
    ? form.user_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '—';
  const billingAccessEnd = billingAccessEndsAt(billingStatus);
  const billingPeriodLabel = billingAccessEnd
    ? new Intl.DateTimeFormat('es-419', { dateStyle: 'long' }).format(new Date(billingAccessEnd))
    : null;
  const canCancelSubscription = billingStatus?.canCancelSubscription === true;
  const cancellationEndsNow = cancellationEndsImmediately(billingStatus);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#004AFE] rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">Cargando configuración</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-[#F1F5F9]">
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('Tasks'))}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F1F5F9] active:scale-95 transition-transform"
          aria-label="Volver a Hoy"
        >
          <ChevronLeft className="w-5 h-5 text-[#0F172A]" aria-hidden="true" />
        </button>
        <h1 className="text-[18px] font-bold text-[#0F172A]">Configuración</h1>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Perfil */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-[#475569] uppercase tracking-wide mb-4">Perfil</h2>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-[#EEF2FF] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Cambiar foto de perfil"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[28px] font-bold text-[#004AFE]">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-1">
                <Camera className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
            </button>
            <p className="text-[15px] text-[#64748B] mt-2">Toca para cambiar foto</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Nombre */}
          <div className="mb-4">
            <label htmlFor="settings-name" className="flex items-center gap-2 text-[15px] font-medium text-[#475569] mb-1.5">
              <User className="w-4 h-4" aria-hidden="true" />
              Nombre completo
            </label>
            <input
              id="settings-name"
              type="text"
              value={form.user_name}
              onChange={e => setForm(prev => ({ ...prev, user_name: e.target.value }))}
              placeholder="Tu nombre"
              autoComplete="name"
              className="w-full min-h-14 px-4 py-3 rounded-xl border border-[#CBD5E1] text-[17px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#004AFE] transition-colors"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="settings-phone" className="flex items-center gap-2 text-[15px] font-medium text-[#475569] mb-1.5">
              <Phone className="w-4 h-4" aria-hidden="true" />
              WhatsApp / Teléfono
            </label>
            <input
              id="settings-phone"
              type="tel"
              value={form.user_phone}
              onChange={e => setForm(prev => ({ ...prev, user_phone: e.target.value }))}
              placeholder="+52 55 0000 0000"
              autoComplete="tel"
              className="w-full min-h-14 px-4 py-3 rounded-xl border border-[#CBD5E1] text-[17px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#004AFE] transition-colors"
            />
          </div>
        </div>

        {/* Moneda */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-[#475569] uppercase tracking-wide mb-4">Preferencias</h2>
          <div>
            <label htmlFor="settings-currency" className="flex items-center gap-2 text-[15px] font-medium text-[#475569] mb-1.5">
              <Globe className="w-4 h-4" aria-hidden="true" />
              Moneda
            </label>
            <select
              id="settings-currency"
              value={form.default_currency}
              onChange={e => setForm(prev => ({ ...prev, default_currency: e.target.value }))}
              className="w-full min-h-14 px-4 py-3 rounded-xl border border-[#CBD5E1] text-[17px] text-[#0F172A] focus:outline-none focus:border-[#004AFE] transition-colors bg-white appearance-none"
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notificaciones */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#004AFE]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#0F172A]">Notificaciones</p>
                <p className="text-[15px] text-[#64748B]">Recordatorios de tareas</p>
              </div>
            </div>
            <button
              onClick={handleNotificationToggle}
              className="relative w-12 h-12 flex items-center justify-center shrink-0"
              aria-label="Activar recordatorios de tareas"
              aria-pressed={form.notifications_enabled}
            >
              <span
                className={`relative block w-12 h-6 rounded-full overflow-hidden transition-colors duration-200 ${
                  form.notifications_enabled ? 'bg-[#004AFE]' : 'bg-[#94A3B8]'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.notifications_enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Código de partner */}
        {settings?.partner_code && (
          <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-[#475569] uppercase tracking-wide mb-4">Tu código de partner</h2>
            <p className="text-[15px] text-[#64748B] mb-3">Comparte este código para que tus partners se unan a tu red.</p>
            <div className="flex items-center justify-center bg-[#EEF2FF] rounded-xl px-4 py-4 mb-4">
              <span className="text-[32px] font-bold text-[#004AFE] tracking-[0.3em]">{settings.partner_code}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyCode}
                className="flex-1 min-h-12 flex items-center justify-center gap-2 py-3 bg-[#F1F5F9] rounded-xl text-[15px] font-semibold text-[#0F172A] active:scale-95 transition-transform"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={handleShareCode}
                className="flex-1 min-h-12 flex items-center justify-center gap-2 py-3 bg-[#004AFE] rounded-xl text-[15px] font-semibold text-white active:scale-95 transition-transform"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </div>
        )}

        {/* Guardar */}
        <motion.button
          onClick={handleSave}
          disabled={saveMutation.isPending || saved}
          animate={saved ? { scale: [1, 1.04, 1], backgroundColor: '#16a34a' } : { scale: 1, backgroundColor: '#004AFE' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full py-4 text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 disabled:opacity-80"
        >
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2"
              >
                <Check className="w-5 h-5" strokeWidth={3} />
                ¡Guardado!
              </motion.span>
            ) : saveMutation.isPending ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Guardar cambios
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-[#475569] uppercase tracking-wide mb-3">Estado de la cuenta</h2>
          <p className="text-[17px] font-bold text-[#0F172A]">
            {billingIsLoading
              ? 'Revisando tu cuenta…'
              : billingIsError
                ? 'No pudimos consultar el estado'
                : billingStatus?.label || BILLING_LABELS[billingStatus?.state] || 'Sin acceso activo'}
          </p>
          {billingIsError && (
            <div className="mt-3 rounded-xl bg-red-50 p-4 text-[15px] text-red-800" role="alert">
              <p>Tu sesión sigue abierta. Revisa tu conexión e intenta de nuevo.</p>
              <button type="button" onClick={() => refetchBilling()} className="mt-2 min-h-12 rounded-xl px-2 font-bold text-[#004AFE]">
                Intentar de nuevo
              </button>
            </div>
          )}
          {billingStatus?.state === 'grace' && (
            <p className="mt-3 rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900" role="status">
              Hubo un problema con el último cobro. Tus datos siguen guardados y puedes pedir ayuda antes de que termine el periodo de gracia.
            </p>
          )}
          {billingAccessEnd && (
            <p className="mt-2 flex items-center gap-2 text-[15px] text-[#64748B]">
              <CalendarDays className="w-5 h-5" aria-hidden="true" />
              Acceso hasta {billingPeriodLabel}
            </p>
          )}
          {billingStatus?.cancelAtPeriodEnd && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800" role="status">
              <p className="text-[17px] font-bold">Renovación cancelada</p>
              <p className="mt-1 text-[15px] leading-relaxed">
                No habrá otro cobro. Puedes usar Zynergia {billingPeriodLabel ? `hasta el ${billingPeriodLabel}` : 'hasta terminar tu periodo pagado'}. Tu cuenta y tus datos permanecen guardados.
              </p>
            </div>
          )}
          {canCancelSubscription && (
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              className="mt-4 min-h-14 w-full rounded-xl border border-red-200 bg-white px-4 text-[17px] font-semibold text-red-700 active:scale-[0.99] transition-transform"
            >
              Cancelar mi suscripción
            </button>
          )}
        </div>

        <AlertDialog
          open={cancelDialogOpen}
          onOpenChange={(open) => {
            if (cancelBillingMutation.isPending) return;
            setCancelDialogOpen(open);
            setCancelError('');
          }}
        >
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">¿Cancelar la renovación?</AlertDialogTitle>
              <AlertDialogDescription className="text-[15px] leading-6">
                {cancellationEndsNow
                  ? 'Detendremos los siguientes intentos de cobro y tu acceso terminará al confirmar. No borraremos tu cuenta ni tus datos.'
                  : `No habrá otro cobro. Puedes seguir usando Zynergia ${billingPeriodLabel ? `hasta el ${billingPeriodLabel}` : 'hasta terminar tu periodo pagado'}. No recibirás un reembolso y no borraremos tu cuenta ni tus datos.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {cancelError && (
              <p className="rounded-xl bg-red-50 p-3 text-[15px] text-red-700" role="alert">
                {cancelError} Tus datos siguen intactos.
              </p>
            )}
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={cancelBillingMutation.isPending} className="min-h-12 text-[15px]">
                Conservar suscripción
              </AlertDialogCancel>
              <button
                type="button"
                onClick={() => cancelBillingMutation.mutate()}
                disabled={cancelBillingMutation.isPending}
                className="min-h-12 rounded-md bg-red-600 px-4 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {cancelBillingMutation.isPending ? 'Cancelando…' : 'Sí, cancelar renovación'}
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Ayuda */}
        <button
          onClick={() => navigate(createPageUrl('Help'))}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-[#004AFE]" />
            </div>
            <span className="font-semibold text-[#0F172A] text-[15px]">Ayuda</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-[#CBD5E1] rotate-180" />
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="font-semibold text-red-500 text-[15px]">Cerrar sesión</span>
          </div>
        </button>

        {/* Eliminar cuenta (requisito App Store / Google Play) */}
        {deleteStep === 0 && (
          <button
            onClick={() => setDeleteStep(1)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-semibold text-red-500 text-[15px]">Eliminar mi cuenta</span>
            </div>
          </button>
        )}

        {deleteStep >= 1 && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
            {deleteStep === 3 ? (
              <>
                <p className="text-[17px] font-bold text-red-700 mb-2">Eliminación programada</p>
                <p className="text-[15px] text-red-700 leading-relaxed">
                  {deletionDate
                    ? `Conservas acceso hasta el ${new Intl.DateTimeFormat('es-419', { dateStyle: 'long' }).format(new Date(deletionDate))}. Después eliminaremos tu cuenta y tus datos.`
                    : 'Tu cuenta y tus datos se eliminarán lo antes posible.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-[17px] font-bold text-red-700 mb-1.5">¿Eliminar tu cuenta?</p>
                <p className="text-[15px] text-red-700 leading-relaxed mb-4">
                  Cancelaremos la renovación. Si tienes tiempo pagado, conservarás acceso hasta que termine; después borraremos tus datos. No se puede deshacer.
                </p>
                <label htmlFor="delete-account-password" className="block text-[15px] font-semibold text-red-800 mb-2">Escribe tu contraseña para confirmar</label>
                <input
                  id="delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={event => setDeletePassword(event.target.value)}
                  className="min-h-14 w-full rounded-xl border border-red-200 bg-white px-4 text-[17px] text-[#0F172A] outline-none focus:ring-2 focus:ring-red-500 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setDeleteStep(0); setDeletePassword(''); }}
                    disabled={deleteStep === 2}
                    className="flex-1 min-h-12 bg-white rounded-xl text-[15px] font-semibold text-[#0F172A] border border-red-100 active:scale-95 transition-transform disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteStep === 2 || !deletePassword}
                    className="flex-1 min-h-12 bg-red-600 rounded-xl text-[15px] font-semibold text-white active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleteStep === 2 ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Eliminar'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Legal */}
        <div className="flex items-center justify-center gap-5 pt-1">
          <a
            href="https://zynergia.pro/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-12 flex items-center gap-1.5 text-[15px] text-[#475569]"
          >
            <Shield className="w-3.5 h-3.5" />
            Política de privacidad
          </a>
        </div>

        {/* Version */}
        <p className="text-center text-[15px] text-[#64748B] pb-2">Zynergia v1.1.0</p>
      </div>
    </div>
  );
}
