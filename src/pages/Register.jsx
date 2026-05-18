/**
 * Página de registro post-pago.
 * Flujo: Landing → Stripe Checkout → /register?session_id=xxx → aquí → App
 *
 * REQUISITO: Desactiva la confirmación de email en Supabase:
 *   Dashboard → Authentication → Providers → Email → "Confirm email" → OFF
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [step, setStep] = useState('verifying'); // 'verifying' | 'form' | 'error'
  const [paymentData, setPaymentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!sessionId || !sessionId.startsWith('cs_')) {
      setErrorMsg('Enlace inválido. Por favor vuelve a la página principal y completa el pago.');
      setStep('error');
      return;
    }

    fetch(`/api/verify-payment?session_id=${encodeURIComponent(sessionId)}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok || !data.paid) throw new Error(data.error || 'Pago no confirmado');
        return data;
      })
      .then(data => {
        setPaymentData(data);
        setEmail(data.email || '');
        setStep('form');
      })
      .catch(err => {
        setErrorMsg(err.message || 'No se pudo verificar el pago. Intenta de nuevo.');
        setStep('error');
      });
  }, [sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !email.trim() || password.length < 6) {
      setFormError('Por favor completa todos los campos. La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);

    try {
      // 1. Crear cuenta en Supabase
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signupError) throw signupError;

      const userId = authData?.user?.id;
      if (!userId) throw new Error('No se pudo crear la cuenta. Intenta de nuevo.');

      // 2. Crear settings con stripe_paid = true
      const letters = name.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
      const digits = String(Math.floor(Math.random() * 90) + 10);
      const partnerCode = letters + digits;

      await supabase.from('settings').upsert({
        user_id: userId,
        user_name: name.trim(),
        default_currency: 'MXN',
        notifications_enabled: true,
        stripe_paid: true,
        stripe_session_id: sessionId,
        partner_code: partnerCode,
      }, { onConflict: 'user_id' });

      // 3. Marcar onboarding como completo (ya recolectamos el nombre)
      localStorage.setItem(`zynergia_onboarding_done_${userId}`, 'true');

      // 4. Si hay sesión activa (email confirmation desactivada), ir directo a la app
      if (authData?.session) {
        navigate('/', { replace: true });
      } else {
        // Email confirmation activa — decirle al usuario que confirme su correo
        setStep('confirm-email');
      }
    } catch (err) {
      setFormError(err.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Estados de UI ─────────────────────────────────────────────────────────

  if (step === 'verifying') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <Loader2 className="w-10 h-10 text-[#004AFE] animate-spin mx-auto mb-4" />
          <p className="text-[#0F172A] font-semibold text-[17px]">Verificando tu pago…</p>
          <p className="text-[#64748B] text-[14px] mt-1">Solo un momento</p>
        </div>
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
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-2">Error de verificación</h1>
          <p className="text-[#64748B] text-[15px] leading-relaxed mb-7">{errorMsg}</p>
          <a
            href="/landing"
            className="block w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl text-center"
          >
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

  if (step === 'confirm-email') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-2">Confirma tu correo</h1>
          <p className="text-[#64748B] text-[15px] leading-relaxed mb-7">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            Ábrelo y luego inicia sesión aquí.
          </p>
          <a
            href="/"
            className="block w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl text-center"
          >
            Ir a iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-[13px] font-semibold px-4 py-1.5 rounded-full mb-5">
          <CheckCircle2 className="w-4 h-4" />
          ¡Pago confirmado!
        </div>

        <div className="w-16 h-16 rounded-3xl bg-[#004AFE] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">Z</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#0F172A]">Crea tu cuenta</h1>
        <p className="text-[15px] text-[#64748B] mt-1">Un solo paso para entrar a Zynergia</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#64748B] mb-1.5">
            Tu nombre completo
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="María García"
            required
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#64748B] mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

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
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

        {formError && (
          <p className="text-[13px] text-red-500 bg-red-50 px-4 py-3 rounded-xl">{formError}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name || !email || password.length < 6}
          className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Crear cuenta y entrar'
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
