import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SetPassword() {
  const [step, setStep] = useState('waiting'); // waiting | form | saving | done | error
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [formError, setFormError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Detect error in URL hash (expired/invalid token from Supabase)
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const desc = params.get('error_description') || 'El enlace expiró o ya fue usado.';
      setErrorMsg(decodeURIComponent(desc).replace(/\+/g, ' '));
      setStep('error');
      return;
    }

    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        settled = true;
        setStep('form');
      }
    });

    // Fallback: check existing session after a short delay
    // (handles cases where the event already fired before our listener was attached)
    setTimeout(() => {
      if (settled) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !settled) {
          settled = true;
          setStep('form');
        }
      });
    }, 800);

    // Hard timeout: if after 12s nothing happened, the token is bad
    const timeout = setTimeout(() => {
      if (!settled) {
        setErrorMsg('El enlace expiró o no es válido. Pide uno nuevo a soporte.');
        setStep('error');
      }
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

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

    setStep('saving');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        localStorage.setItem(`zynergia_onboarding_done_${session.user.id}`, 'true');
      }

      setStep('done');
      // Recarga completa: este branch público no tiene ruta "/" en su Router
      setTimeout(() => window.location.replace('/'), 2000);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo guardar la contraseña. Intenta de nuevo.');
      setStep('error');
    }
  };

  if (step === 'waiting') {
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
            <p className="text-white font-bold text-[24px] mb-2">Verificando tu acceso…</p>
            <p className="text-blue-200 text-[15px]">Un momento</p>
            <div className="mt-6 flex justify-center">
              <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'saving') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-[#004AFE] flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold">Z</span>
          </div>
          <Loader2 className="w-8 h-8 text-[#004AFE] animate-spin mx-auto mb-4" />
          <p className="text-[#0F172A] font-bold text-[20px]">Guardando contraseña…</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
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
            ¡Contraseña creada!
          </motion.p>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="text-[#64748B] text-[15px] mt-1">
            Entrando a la app…
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-2">Enlace inválido</h1>
          <p className="text-[#64748B] text-[15px] leading-relaxed mb-7">{errorMsg}</p>
          <a href="/" className="block w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl text-center">
            Ir a iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#004AFE] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">Z</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#0F172A]">Crea tu contraseña</h1>
        <p className="text-[15px] text-[#64748B] mt-1">Elige una contraseña para entrar a Zynergia</p>
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
          disabled={!password || password.length < 6 || password !== password2}
          className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          Guardar y entrar
        </button>
      </form>
    </div>
  );
}
