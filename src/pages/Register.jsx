import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, TriangleAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BrandMark from '@/components/ui/BrandMark';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

const canonicalUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://zynergia.pro';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupState, setSignupState] = useState('checking');
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [error, setError] = useState('');

  const refreshSignupState = useCallback(async () => {
    setSignupState('checking');
    try {
      const availability = await apiFetch('/api/billing/signup-status', { auth: false });
      setSignupState(availability?.enabled === true ? 'open' : 'closed');
    } catch {
      setSignupState('error');
    }
  }, []);

  useEffect(() => {
    refreshSignupState();
  }, [refreshSignupState]);

  const update = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({
      ...current,
      [field]: '',
      ...(field === 'password' ? { confirmPassword: '' } : {}),
    }));
    setError('');
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    /** @type {Record<string, string>} */
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Escribe tu nombre completo.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Escribe un correo válido. Ejemplo: nombre@gmail.com';
    if (form.password.length < 8) nextErrors.password = 'Usa al menos 8 caracteres.';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Vuelve a escribir tu contraseña.';
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden. Escríbelas igual.';
    if (!form.accepted) nextErrors.accepted = 'Marca esta casilla para continuar.';
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      const firstField = ['name', 'email', 'password', 'confirmPassword', 'accepted']
        .find(field => nextErrors[field]);
      const elementIds = {
        name: 'register-name',
        email: 'register-email',
        password: 'register-password',
        confirmPassword: 'register-password-confirmation',
        accepted: 'register-legal',
      };
      window.requestAnimationFrame(() => document.getElementById(elementIds[firstField])?.focus());
      return;
    }

    setLoading(true);
    try {
      const availability = await apiFetch('/api/billing/signup-status', { auth: false });
      if (availability?.enabled !== true) {
        setSignupState('closed');
        setLoading(false);
        return;
      }
    } catch {
      setError('No pudimos confirmar que las cuentas nuevas estén disponibles. No se creó ninguna cuenta. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    try {
      const email = form.email.trim().toLowerCase();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${canonicalUrl}/cuenta`,
          data: {
            full_name: form.name.trim(),
            legal_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        navigate('/cuenta', { replace: true });
        return;
      }

      sessionStorage.setItem('zynergia_verification_email', email);
      sessionStorage.setItem('zynergia_verification_sent_at', String(Date.now()));
      navigate('/verificar-correo', { replace: true, state: { email } });
    } catch (signUpError) {
      const message = signUpError?.message?.toLowerCase() || '';
      setError(message.includes('already registered') || message.includes('already exists')
        ? 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.'
        : 'No pudimos crear tu cuenta. Tus datos siguen aquí. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <Link to="/" className="brand-link" aria-label="Volver a Zynergia"><BrandMark className="brand-mark" /></Link>
        <p className="eyebrow">Paso 1 de 4 · Tu cuenta</p>
        <h1 id="register-title">Crea tu cuenta</h1>
        <p className="auth-lead">Escribe tus datos. Después te enviaremos un correo para confirmar que la cuenta es tuya.</p>

        {signupState === 'checking' && (
          <div className="status-panel" aria-live="polite">
            <Loader2 className="spinner" aria-hidden="true" />
            <p>Revisando disponibilidad…</p>
          </div>
        )}

        {signupState === 'closed' && (
          <p className="billing-warning" role="status">
            Las cuentas nuevas están pausadas por el momento. Si ya tienes una cuenta, puedes iniciar sesión normalmente.
          </p>
        )}

        {signupState === 'error' && (
          <div className="state-card state-card--error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <div>
              <strong>No pudimos revisar las cuentas nuevas</strong>
              <p>No se creó ninguna cuenta. Revisa tu conexión e intenta de nuevo.</p>
            </div>
            <button type="button" onClick={refreshSignupState}>Intentar de nuevo</button>
          </div>
        )}

        {signupState === 'open' && <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
          <label htmlFor="register-name">Nombre completo</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={event => update('name', event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
          />
          {fieldErrors.name && <p id="register-name-error" className="field-error" role="alert">{fieldErrors.name}</p>}

          <label htmlFor="register-email">Correo electrónico</label>
          <input
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            value={form.email}
            onChange={event => update('email', event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
          />
          {fieldErrors.email && <p id="register-email-error" className="field-error" role="alert">{fieldErrors.email}</p>}

          <label htmlFor="register-password">Crea una contraseña</label>
          <div className="password-field password-field--labeled">
            <input
              id="register-password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={event => update('password', event.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={`password-help${fieldErrors.password ? ' register-password-error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? 'Ocultar la primera contraseña' : 'Ver la primera contraseña'}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
            </button>
          </div>
          <p id="password-help" className="field-help">Usa al menos 8 caracteres.</p>
          {fieldErrors.password && <p id="register-password-error" className="field-error" role="alert">{fieldErrors.password}</p>}

          <label htmlFor="register-password-confirmation">Repite la contraseña</label>
          <div className="password-field password-field--labeled">
            <input
              id="register-password-confirmation"
              name="confirm-password"
              type={showConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              value={form.confirmPassword}
              onChange={event => update('confirmPassword', event.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? 'register-password-confirmation-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirmation(value => !value)}
              aria-label={showConfirmation ? 'Ocultar la contraseña repetida' : 'Ver la contraseña repetida'}
            >
              {showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              <span>{showConfirmation ? 'Ocultar' : 'Ver'}</span>
            </button>
          </div>
          {form.confirmPassword && form.password === form.confirmPassword && !fieldErrors.confirmPassword && (
            <p className="field-match" role="status">Las contraseñas coinciden.</p>
          )}
          {fieldErrors.confirmPassword && <p id="register-password-confirmation-error" className="field-error" role="alert">{fieldErrors.confirmPassword}</p>}

          <label className="legal-check">
            <input
              id="register-legal"
              type="checkbox"
              checked={form.accepted}
              onChange={event => update('accepted', event.target.checked)}
              aria-invalid={Boolean(fieldErrors.accepted)}
              aria-describedby={fieldErrors.accepted ? 'register-legal-error' : undefined}
            />
            <span>Acepto los <Link to="/terminos">Términos</Link> y el <Link to="/privacidad">Aviso de privacidad</Link>.</span>
          </label>
          {fieldErrors.accepted && <p id="register-legal-error" className="field-error" role="alert">{fieldErrors.accepted}</p>}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-action" type="submit" disabled={loading}>
            {loading && <Loader2 className="spinner" aria-hidden="true" />}
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>}

        <p className="auth-switch">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Iniciar sesión</Link></p>
      </section>
    </main>
  );
}
