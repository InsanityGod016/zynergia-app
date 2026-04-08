import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronLeft, User, Phone, Globe, Bell, LogOut, Camera, HelpCircle, Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const { logout } = useAuth();

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.Settings.list()
  });

  const settings = settingsList[0] || null;

  const [form, setForm] = useState({
    user_name: '',
    user_phone: '',
    default_currency: 'MXN',
    notifications_enabled: true,
    user_photo: ''
  });

  const [photoPreview, setPhotoPreview] = useState('');
  const [saved, setSaved] = useState(false);

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

      // Auto-generate partner_code for existing users who don't have one
      if (!settings.partner_code && settings.id && settings.user_name) {
        const letters = settings.user_name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
        const digits = String(Math.floor(Math.random() * 90) + 10);
        const code = letters + digits;
        db.Settings.update(settings.id, { partner_code: code })
          .then(() => queryClient.invalidateQueries({ queryKey: ['settings'] }))
          .catch(() => {});
      }
    }
  }, [settings?.id]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
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
    mutationFn: async (enabled) => {
      if (settings?.id) return db.Settings.update(settings.id, { notifications_enabled: enabled });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
    onError: () => toast.error('No se pudo guardar la preferencia'),
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

  const initials = form.user_name
    ? form.user_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'Z';

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#004AFE] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-[#F1F5F9]">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F1F5F9] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-[#0F172A]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#0F172A]">Configuración</h1>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Perfil */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
          <h2 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide mb-4">Perfil</h2>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-[#EEF2FF] flex items-center justify-center active:scale-95 transition-transform"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[28px] font-bold text-[#004AFE]">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-1">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            <p className="text-[12px] text-[#94A3B8] mt-2">Toca para cambiar foto</p>
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
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#64748B] mb-1.5">
              <User className="w-4 h-4" />
              Nombre completo
            </label>
            <input
              type="text"
              value={form.user_name}
              onChange={e => setForm(prev => ({ ...prev, user_name: e.target.value }))}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] transition-colors"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#64748B] mb-1.5">
              <Phone className="w-4 h-4" />
              WhatsApp / Teléfono
            </label>
            <input
              type="tel"
              value={form.user_phone}
              onChange={e => setForm(prev => ({ ...prev, user_phone: e.target.value }))}
              placeholder="+52 55 0000 0000"
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] transition-colors"
            />
          </div>
        </div>

        {/* Moneda */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
          <h2 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide mb-4">Preferencias</h2>
          <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#64748B] mb-1.5">
              <Globe className="w-4 h-4" />
              Moneda
            </label>
            <select
              value={form.default_currency}
              onChange={e => setForm(prev => ({ ...prev, default_currency: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] focus:outline-none focus:border-[#004AFE] transition-colors bg-white appearance-none"
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
                <Bell className="w-5 h-5 text-[#004AFE]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#0F172A]">Notificaciones</p>
                <p className="text-[12px] text-[#94A3B8]">Recordatorios de tareas</p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !form.notifications_enabled;
                setForm(prev => ({ ...prev, notifications_enabled: next }));
                toggleNotifMutation.mutate(next);
              }}
              className={`relative w-12 h-6 rounded-full overflow-hidden transition-colors duration-200 ${
                form.notifications_enabled ? 'bg-[#004AFE]' : 'bg-[#CBD5E1]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  form.notifications_enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Código de partner */}
        {settings?.partner_code && (
          <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-5">
            <h2 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide mb-4">Tu código de partner</h2>
            <p className="text-[13px] text-[#94A3B8] mb-3">Comparte este código para que tus partners se unan a tu red.</p>
            <div className="flex items-center justify-center bg-[#EEF2FF] rounded-xl px-4 py-4 mb-4">
              <span className="text-[32px] font-bold text-[#004AFE] tracking-[0.3em]">{settings.partner_code}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyCode}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#F1F5F9] rounded-xl text-[14px] font-semibold text-[#0F172A] active:scale-95 transition-transform"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={handleShareCode}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#004AFE] rounded-xl text-[14px] font-semibold text-white active:scale-95 transition-transform"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </div>
        )}

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saved ? (
            <>
              <Check className="w-5 h-5" />
              Guardado
            </>
          ) : saveMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Guardar cambios'
          )}
        </button>

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

        {/* Version */}
        <p className="text-center text-[12px] text-[#CBD5E1] pb-2">Zynergia v1.0.0</p>
      </div>
    </div>
  );
}
