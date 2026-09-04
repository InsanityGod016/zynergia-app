import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import BrandMark from '@/components/ui/BrandMark';
import { supabase } from '@/lib/supabaseClient';

const canonicalUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://zynergia.pro';
const passwordResetUrl = new URL('/set-password', canonicalUrl).toString();

export default function Login({ initialMode = 'login', showRegistration = true, registrationUrl = '/crear-cuenta' }) {
  const location = useLocation();
  const returnsToDeletion = new URLSearchParams(location.search).get('returnTo') === '/eliminar-cuenta';
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: passwordResetUrl,
        });
        if (resetError) throw resetError;
        setMessage('Listo. Busca un correo de “Zynergia” con el asunto “Zynergia — restablece tu contraseña”. Revisa también Spam o Correo no deseado.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) throw signInError;
    } catch (requestError) {
      const text = requestError?.message?.toLowerCase() || '';
      if (text.includes('invalid login')) {
        setError('El correo o la contraseña no coinciden. Puedes intentar de nuevo o recuperar tu contraseña.');
      } else if (text.includes('email not confirmed')) {
        setError('Primero confirma tu correo. Revisa tu bandeja de entrada y también Spam.');
      } else if (text.includes('fetch') || text.includes('network')) {
        setError('No pudimos conectar con el servicio de cuentas. Tu contraseña no fue rechazada; intenta de nuevo más tarde.');
      } else {
        setError('No pudimos continuar. Tus datos siguen aquí. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link to="/" className="brand-link" aria-label="Zynergia"><BrandMark className="brand-mark" /></Link>
        <p className="eyebrow">{mode === 'login' ? 'Bienvenido' : 'Recupera tu acceso'}</p>
        <h1 id="login-title">{mode === 'login' ? 'Iniciar sesión' : 'Restablecer contraseña'}</h1>
        <p className="auth-lead">{mode === 'login' ? 'Usa el mismo correo y contraseña de tu cuenta.' : 'Te enviaremos un enlace seguro a tu correo.'}</p>
        {mode === 'login' && returnsToDeletion && <p className="instruction-card">Al entrar, volverás a la solicitud para eliminar tu cuenta.</p>}
        {mode === 'reset' && (
          <div className="instruction-card instruction-card--block" role="note">
            <strong>Busca este correo:</strong>
            <span className="email-highlight">Remitente: Zynergia</span>
            <span className="email-highlight">Asunto: Zynergia — restablece tu contraseña</span>
            <p className="email-help">Si no aparece en tu bandeja, revisa Spam o Correo no deseado.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="login-email">Correo electrónico</label>
          <input id="login-email" name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />

          {mode === 'login' && <>
            <label htmlFor="login-password">Contraseña</label>
            <div className="password-field">
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </>}

          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}

          <button type="submit" className="primary-action" disabled={loading || !email || (mode === 'login' && !password)}>
            {loading && <Loader2 className="spinner" aria-hidden="true" />}
            {loading ? 'Espera…' : mode === 'login' ? 'Iniciar sesión' : 'Enviarme el enlace'}
          </button>
        </form>

        {mode === 'login' ? <>
          <button type="button" className="text-action" onClick={() => { setMode('reset'); setError(''); }}>¿Olvidaste tu contraseña?</button>
          {showRegistration && <p className="auth-switch">¿Aún no tienes cuenta? <Link to={registrationUrl}>Crear cuenta</Link></p>}
        </> : (
          <button type="button" className="text-action" onClick={() => { setMode('login'); setError(''); setMessage(''); }}>← Volver a iniciar sesión</button>
        )}
      </section>
    </main>
  );
}
