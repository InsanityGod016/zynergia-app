import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const canonicalUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://zynergia.pro';
const resendDelayMs = 60_000;

function getRemainingSeconds() {
  const sentAt = Number(sessionStorage.getItem('zynergia_verification_sent_at'));
  if (!Number.isFinite(sentAt)) return 0;
  return Math.max(0, Math.ceil((sentAt + resendDelayMs - Date.now()) / 1000));
}

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || sessionStorage.getItem('zynergia_verification_email') || '';
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(getRemainingSeconds);

  useEffect(() => {
    if (!remaining) return undefined;
    const timer = window.setInterval(() => setRemaining(getRemainingSeconds()), 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const resend = async () => {
    if (!email || remaining) return;
    setSending(true);
    setError('');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${canonicalUrl}/cuenta` },
    });
    setSending(false);
    if (resendError) {
      setError('No pudimos reenviar el correo. Espera un minuto e intenta de nuevo.');
    } else {
      sessionStorage.setItem('zynergia_verification_sent_at', String(Date.now()));
      setRemaining(60);
      setSent(true);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--center" aria-labelledby="verify-title">
        <div className="auth-icon"><Mail aria-hidden="true" /></div>
        <p className="eyebrow">Paso 2 de 4 · Confirma tu correo</p>
        <h1 id="verify-title">Abre el correo que te enviamos</h1>
        <p className="auth-lead">
          Lo enviamos a {email ? <strong className="email-highlight">{email}</strong> : 'tu correo'}.
        </p>
        <div className="instruction-card instruction-card--block">
          <ol className="instruction-steps">
            <li>Abre tu aplicación de correo.</li>
            <li>Busca el correo de <strong>Zynergia</strong> con el asunto “Confirma tu cuenta”.</li>
            <li>Toca el botón <strong>Confirmar mi cuenta</strong>. Volverás aquí para pagar.</li>
          </ol>
        </div>
        <p className="email-help">¿No aparece? Revisa <strong>Spam</strong> o <strong>Correo no deseado</strong>.</p>
        {sent && <p className="form-success" role="status">Listo. Enviamos otro correo.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="secondary-action" type="button" onClick={resend} disabled={!email || sending || remaining > 0}>
          {sending && <Loader2 className="spinner" aria-hidden="true" />}
          {sending ? 'Enviando…' : remaining > 0 ? `Reenviar en ${remaining} s` : 'Reenviar correo'}
        </button>
        <Link className="text-action" to="/crear-cuenta">Escribí mal mi correo</Link>
        <Link className="text-action text-action--quiet" to="/iniciar-sesion">Ya confirmé mi cuenta: iniciar sesión</Link>
      </section>
    </main>
  );
}
