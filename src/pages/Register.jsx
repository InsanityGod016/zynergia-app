import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  // verifying → form → creating → welcome | error
  const [step, setStep] = useState('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  // ── Al cargar: verificar pago Y crear la cuenta de inmediato (server-side).
  //    Así la cuenta EXISTE aunque cierren la ventana antes de poner contraseña.
  useEffect(() => {
    if (!sessionId || !sessionId.startsWith('cs_')) {
      setErrorMsg('Enlace inválido. Vuelve a la página principal y completa el pago.');
      setStep('error');
      return;
    }

    fetch('/api/finalize-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.detalle || 'No se pudo confirmar el pago');
        return data;
      })
      .then(data => {
        setEmail(data.email || '');
        setStep('form');
      })
      .catch(err => {
        setErrorMsg(err.message || 'No se pudo verificar el pago. Intenta de nuevo.');
        setStep('error');
      });
  }, [sessionId]);

  // ── Aviso si intentan cerrar la ventana antes de terminar ──
  useEffect(() => {
    const warn = (e) => {
      if (done) return;
      if (step === 'form' || step === 'creating') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [step, done]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== password2) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setStep('creating');

    try {
      // 1. Fijar la contraseña que el usuario eligió (server-side, idempotente)
      const r = await fetch('/api/finalize-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.detalle || 'No se pudo guardar la contraseña');

      // 2. Iniciar sesión con esa contraseña
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: (data.email || email).trim(),
        password,
      });
      if (signInError) throw signInError;

      const userId = signInData?.user?.id;
      if (userId) localStorage.setItem(`zynergia_onboarding_done_${userId}`, 'true');

      setDone(true);
      setStep('welcome');
      // window.location (no navigate): /download vive en el branch público y
      // el Router de este branch no tiene ruta "/" — navigate dejaría pantalla blanca
      setTimeout(() => window.location.replace('/download'), 1800);
    } catch (err) {
      setStep('form');
      setFormError(err.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verificando pago + creando cuenta base ──
  if (step === 'verifying') {
    return (
      <div className="fixed inset-0 bg-[#004AFE] flex items-center justify-center">
        <div className="text-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
          >
            <span className="text-[#004AFE] text-4xl font-bold">Z</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <p className="text-white font-bold text-[28px] mb-2">¡Pago confirmado!</p>
            <p className="text-blue-100 text-[16px]">Creando tu cuenta… <span className="font-semibold">no cierres esta ventana</span></p>
            <div className="mt-6 flex justify-center">
              <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Guardando contraseña / iniciando sesión ──
  if (step === 'creating') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-[#004AFE] flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold">Z</span>
          </div>
          <Loader2 className="w-8 h-8 text-[#004AFE] animate-spin mx-auto mb-4" />
          <p className="text-[#0F172A] font-bold text-[20px]">Activando tu cuenta…</p>
          <p className="text-[#64748B] text-[14px] mt-1">Un segundo, <span className="font-semibold text-[#0F172A]">no cierres la ventana</span></p>
        </div>
      </div>
    );
  }

  // ── Bienvenida ──
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-[#0F172A] font-bold text-[24px]">
            ¡Listo, bienvenido!
          </motion.p>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="text-[#64748B] text-[15px] mt-1">
            Tu cuenta quedó activa. Entrando…
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── Error ──
  if (step === 'error') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-2">Algo salió mal</h1>
          <p className="text-[#64748B] text-[15px] leading-relaxed mb-7">{errorMsg}</p>
          <a href="/landing" className="block w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl text-center">
            Volver al inicio
          </a>
          <p className="mt-4 text-[13px] text-[#94A3B8]">
            ¿Ya tienes cuenta?{' '}
            <a href="/" className="text-[#004AFE] font-medium">Inicia sesión</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario para crear contraseña ──
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-[13px] font-semibold px-4 py-1.5 rounded-full mb-5">
          <CheckCircle2 className="w-4 h-4" />
          ¡Pago confirmado! Tu cuenta ya está creada
        </div>
        <div className="w-16 h-16 rounded-3xl bg-[#004AFE] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">Z</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#0F172A]">Crea tu contraseña</h1>
        <p className="text-[15px] text-[#64748B] mt-1">
          {email ? <>Para tu cuenta <span className="font-semibold text-[#0F172A]">{email}</span></> : 'Elige una contraseña para entrar'}
        </p>
      </div>

      {/* Aviso de no cerrar */}
      <div className="w-full max-w-sm mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-800 leading-snug">
          No cierres esta ventana hasta terminar. Solo elige tu contraseña y entra — toma 5 segundos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#64748B] mb-1.5">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            autoFocus
            autoComplete="new-password"
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#64748B] mb-1.5">
            Repite la contraseña
          </label>
          <input
            type="password"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            placeholder="Repite tu contraseña"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

        {formError && (
          <p className="text-[13px] text-red-500 bg-red-50 px-4 py-3 rounded-xl">{formError}</p>
        )}

        <button
          type="submit"
          disabled={loading || password.length < 6 || password !== password2}
          className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Guardar y entrar'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#94A3B8]">
        ¿Ya tienes cuenta?{' '}
        <a href="/" className="text-[#004AFE] font-medium">Inicia sesión aquí</a>
      </p>
    </div>
  );
}
