import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from '@/components/ui/BrandMark';
import {
  clearRememberedPasswordRecovery,
  isRememberedPasswordRecovery,
} from '@/lib/passwordRecovery';
import { APP_LANDING_URL } from '@/lib/app-links';
import { clearLocalSupabaseSession, supabase } from '@/lib/supabaseClient';

export default function SetPassword() {
  const [step, setStep] = useState('waiting');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.has('error') || query.has('error')) {
      setStep('invalid');
      return undefined;
    }

    let active = true;
    let settled = false;
    let checking = false;
    const acceptRecovery = session => {
      if (!active || settled || !isRememberedPasswordRecovery(session)) return;
      settled = true;
      setStep('form');
    };

    const checkRecovery = async () => {
      if (!active || settled || checking) return;
      checking = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        acceptRecovery(session);
      } finally {
        checking = false;
      }
    };
    checkRecovery();
    const interval = window.setInterval(checkRecovery, 250);

    const timeout = window.setTimeout(() => {
      if (!settled && active) setStep('invalid');
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== password2) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      setFormError('No pudimos guardar. Tus contraseñas siguen aquí. Intenta de nuevo.');
      return;
    }

    clearRememberedPasswordRecovery();
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    clearLocalSupabaseSession();
    setSaving(false);
    setStep('done');
  };

  if (step === 'waiting') {
    return (
      <main className="auth-page">
        <section className="auth-card auth-card--center" aria-live="polite">
          <BrandMark className="brand-mark auth-centered-mark" />
          <h1>Verificando tu enlace…</h1>
          <p className="auth-lead">Esto puede tardar unos segundos.</p>
          <Loader2 className="hero-spinner" aria-hidden="true" />
        </section>
      </main>
    );
  }

  if (step === 'invalid') {
    return (
      <main className="auth-page">
        <section className="auth-card auth-card--center">
          <div className="auth-icon auth-icon--warning"><AlertCircle aria-hidden="true" /></div>
          <h1>Este enlace ya no funciona</h1>
          <p className="auth-lead">Puede haber expirado o haberse usado antes. Pide un enlace nuevo.</p>
          <Link className="primary-action" to="/recuperar-contrasena">Enviar un enlace nuevo</Link>
          <Link className="text-action" to="/iniciar-sesion">Volver a iniciar sesión</Link>
        </section>
      </main>
    );
  }

  if (step === 'done') {
    return (
      <main className="auth-page">
        <section className="auth-card auth-card--center">
          <BrandMark className="brand-mark auth-centered-mark" />
          <div className="auth-icon auth-icon--success"><CheckCircle2 aria-hidden="true" /></div>
          <h1>Contraseña actualizada</h1>
          <p className="auth-lead">Abre Zynergia e inicia sesión con tu correo y tu nueva contraseña.</p>
          <a className="primary-action" href={APP_LANDING_URL}>Abrir Zynergia</a>
          <p className="email-help">En una computadora verás el enlace y el código QR para continuar en tu teléfono.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="password-title">
        <BrandMark className="brand-mark" />
        <p className="eyebrow">Recupera tu acceso</p>
        <h1 id="password-title">Crea una nueva contraseña</h1>
        <p className="auth-lead">Debe tener al menos 8 caracteres.</p>

        <form className="auth-form" onSubmit={handleSubmit} aria-busy={saving}>
          <label htmlFor="new-password">Nueva contraseña</label>
          <div className="password-field password-field--labeled">
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => { setPassword(event.target.value); setFormError(''); }}
              minLength={8}
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar la nueva contraseña' : 'Ver la nueva contraseña'}>
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
            </button>
          </div>

          <label htmlFor="repeat-password">Repite la contraseña</label>
          <div className="password-field password-field--labeled">
            <input
              id="repeat-password"
              name="confirm-password"
              type={showConfirmation ? 'text' : 'password'}
              value={password2}
              onChange={event => { setPassword2(event.target.value); setFormError(''); }}
              minLength={8}
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <button type="button" onClick={() => setShowConfirmation(value => !value)} aria-label={showConfirmation ? 'Ocultar la contraseña repetida' : 'Ver la contraseña repetida'}>
              {showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              <span>{showConfirmation ? 'Ocultar' : 'Ver'}</span>
            </button>
          </div>

          {formError && <p className="form-error" role="alert">{formError}</p>}

          <button type="submit" className="primary-action" disabled={saving || !password || !password2}>
            {saving && <Loader2 className="spinner" aria-hidden="true" />}
            {saving ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
      </section>
    </main>
  );
}
