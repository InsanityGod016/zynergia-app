import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Globe, Phone, User, ArrowRight, CheckCircle2, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { initNotifications } from '@/lib/notifications';
import { seedDefaultData } from '@/lib/seedData';
import { supabase } from '@/lib/supabaseClient';

const CURRENCIES = [
  { value: 'MXN', label: 'MXN — Peso Mexicano' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'ARS', label: 'ARS — Peso Argentino' },
  { value: 'COP', label: 'COP — Peso Colombiano' },
  { value: 'CLP', label: 'CLP — Peso Chileno' },
  { value: 'PEN', label: 'PEN — Sol Peruano' },
  { value: 'BRL', label: 'BRL — Real Brasileño' },
];

function generatePartnerCode(name) {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const digits = String(Math.floor(Math.random() * 90) + 10);
  return letters + digits;
}

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STEPS = [
  {
    id: 0,
    emoji: '🚀',
    title: 'Bienvenido a Zynergia',
    description: 'La herramienta diseñada para distribuidores que quieren crecer de forma organizada, consistente y sin perder el control de su negocio.',
    bg: '#EEF2FF',
    color: '#004AFE',
  },
  {
    id: 1,
    emoji: '🌐',
    title: 'Haz crecer tu red',
    description: 'Registra a tus socios, sigue su avance en el programa Fast Start y recibe alertas cuando están cerca de ganar un bono.',
    bg: '#F0FDF4',
    color: '#16A34A',
  },
  {
    id: 2,
    emoji: '✅',
    title: 'Tareas, contactos y más',
    description: 'Zynergia crea automáticamente las tareas de seguimiento por ti. Solo enfócate en hacer las llamadas y cerrar las ventas.',
    bg: '#FFF7ED',
    color: '#EA580C',
  },
];

// mode="intro"   → shows only the 3 info slides (before login, no auth needed)
// mode="profile" → shows only the profile setup form (after login, new user)
export default function Onboarding({ onComplete, mode = 'profile' }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(mode === 'intro' ? 0 : 3);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    user_name: '',
    user_phone: '',
    default_currency: 'MXN',
    user_photo: '',
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteUser, setInviteUser] = useState(null);   // { user_id, user_name }
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleNext = () => {
    if (mode === 'intro' && step === 2) {
      // Last intro slide → done, go to login
      onComplete();
      return;
    }
    if (step < 3) {
      setDirection(1);
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    if (mode === 'intro') {
      onComplete();
      return;
    }
    setDirection(1);
    setStep(3);
  };

  const handleInviteCode = async (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInviteCode(v);
    setInviteUser(null);
    if (v.length < 4) return;
    setInviteLoading(true);
    try {
      const { data } = await supabase.rpc('lookup_partner_code', { code: v });
      if (data && data.length > 0) setInviteUser({ user_id: data[0].found_user_id, user_name: data[0].found_user_name });
    } catch {}
    setInviteLoading(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await imageToBase64(file);
      setPhotoPreview(base64);
      setProfile(prev => ({ ...prev, user_photo: base64 }));
    } catch {
      toast.error('No se pudo cargar la imagen');
    }
  };

  const handleFinish = async () => {
    if (!profile.user_name.trim()) {
      toast.error('Por favor escribe tu nombre');
      return;
    }
    setSaving(true);
    try {
      const partner_code = generatePartnerCode(profile.user_name.trim());
      await db.Settings.create({
        user_name: profile.user_name.trim(),
        user_phone: profile.user_phone.trim(),
        default_currency: profile.default_currency,
        user_photo: profile.user_photo,
        notifications_enabled: true,
        partner_code,
        parent_id: inviteUser?.user_id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });

      // Auto-register as partner in upline's account
      if (inviteUser?.user_id) {
        await supabase.rpc('register_as_partner', {
          p_upline_user_id: inviteUser.user_id,
          p_new_user_name: profile.user_name.trim(),
          p_new_user_id: user?.id,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[Onboarding] Settings save failed:', err);
    }
    localStorage.setItem(`zynergia_onboarding_done_${user?.id}`, 'true');
    initNotifications(null).catch(() => {});
    seedDefaultData().catch(() => {}); // Non-blocking: create default templates & products
    setSaving(false);
    onComplete();
  };

  const initials = profile.user_name
    ? profile.user_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-14 pb-2 px-5">
        {(mode === 'intro' ? [0, 1, 2] : [3]).map(i => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-[#004AFE]' : i < step ? 'w-3 bg-[#004AFE]/40' : 'w-3 bg-[#E2E8F0]'
            }`}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.28 }}
            className="absolute inset-0"
          >
            {step < 3 ? (
              // Steps 0-2: Informational
              <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                <div
                  className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl mb-8 shadow-sm"
                  style={{ backgroundColor: STEPS[step].bg }}
                >
                  {STEPS[step].emoji}
                </div>
                <h2 className="text-[26px] font-bold text-[#0F172A] leading-tight mb-4">
                  {STEPS[step].title}
                </h2>
                <p className="text-[16px] text-[#64748B] leading-relaxed max-w-xs">
                  {STEPS[step].description}
                </p>
              </div>
            ) : (
              // Step 3: Profile form
              <div className="h-full overflow-y-auto px-6 pt-4 pb-8">
                <div className="text-center mb-6">
                  <h2 className="text-[24px] font-bold text-[#0F172A]">Crea tu perfil</h2>
                  <p className="text-[15px] text-[#64748B] mt-1">Personaliza tu cuenta de Zynergia</p>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-full overflow-hidden bg-[#EEF2FF] flex items-center justify-center active:scale-95 transition-transform shadow-md"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[32px] font-bold text-[#004AFE]">{initials}</span>
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-2">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </button>
                  <p className="text-[12px] text-[#94A3B8] mt-2">Agregar foto (opcional)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#64748B] mb-1.5">
                      <User className="w-4 h-4" />
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={profile.user_name}
                      onChange={e => setProfile(prev => ({ ...prev, user_name: e.target.value }))}
                      placeholder="Tu nombre completo"
                      className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] transition-colors"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#64748B] mb-1.5">
                      <Phone className="w-4 h-4" />
                      WhatsApp (opcional)
                    </label>
                    <input
                      type="tel"
                      value={profile.user_phone}
                      onChange={e => setProfile(prev => ({ ...prev, user_phone: e.target.value }))}
                      placeholder="+52 55 0000 0000"
                      className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] transition-colors"
                    />
                  </div>

                  {/* Código de invitación */}
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#64748B] mb-1.5">
                      <Hash className="w-4 h-4" />
                      Código de invitación <span className="font-normal text-[#94A3B8]">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={e => handleInviteCode(e.target.value)}
                        placeholder="Ej: RAFA23"
                        className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#004AFE] font-bold tracking-widest placeholder:text-[#CBD5E1] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-[#004AFE] transition-colors uppercase"
                        autoCapitalize="characters"
                      />
                      {inviteLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 text-[#004AFE] animate-spin" />
                        </div>
                      )}
                    </div>
                    {inviteUser && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-[#F0FDF4] rounded-xl border border-[#86EFAC]">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        <p className="text-[13px] font-semibold text-[#16A34A]">Invitado por {inviteUser.user_name}</p>
                      </div>
                    )}
                  </div>

                  {/* Moneda */}
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#64748B] mb-1.5">
                      <Globe className="w-4 h-4" />
                      Moneda de tu país
                    </label>
                    <select
                      value={profile.default_currency}
                      onChange={e => setProfile(prev => ({ ...prev, default_currency: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] focus:outline-none focus:border-[#004AFE] transition-colors bg-white"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom buttons */}
      <div className="px-6 pb-10 pt-4 space-y-3">
        {step < 3 ? (
          <>
            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              {mode === 'intro' && step === 2 ? 'Comenzar' : 'Siguiente'}
              <ArrowRight className="w-5 h-5" />
            </button>
            {mode === 'intro' && step < 2 && (
              <button
                onClick={handleSkip}
                className="w-full py-3 text-[#94A3B8] font-medium text-[15px] text-center"
              >
                Saltar
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Empezar con Zynergia
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
