import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import DownloadChoices from '@/components/DownloadChoices';
import BrandMark from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import '@/auth.css';

const steps = {
  '/crear-cuenta': 1,
  '/verificar-correo': 2,
  '/cuenta': 3,
  '/pago/exito': 3,
  '/app': 4,
};

const previousPaths = {
  '/crear-cuenta': '/',
  '/verificar-correo': '/crear-cuenta',
  '/cuenta': '/verificar-correo',
  '/pago/exito': '/cuenta',
  '/app': '/pago/exito',
};

function PreviewNotice() {
  return (
    <div className="sticky top-0 z-50 bg-amber-100 px-4 py-3 text-center text-[14px] font-bold text-amber-950 shadow-sm">
      VISTA PREVIA · No crea cuentas, no pide tarjeta y no cobra
    </div>
  );
}

function PreviewCard({ children, path, onNavigate }) {
  const step = steps[path];
  return (
    <>
      <PreviewNotice />
      <main className="auth-page !min-h-[calc(100dvh-44px)]">
        <section className="auth-card" data-safe-purchase-preview="true">
          {path !== '/' && (
            <button
              type="button"
              className="back-link mb-3 gap-2"
              onClick={() => onNavigate(previousPaths[path])}
            >
              <ArrowLeft aria-hidden="true" /> Volver
            </button>
          )}
          {step && (
            <div className="mb-5" aria-label={`Paso ${step} de 4`}>
              <div className="mb-2 flex items-center justify-between text-[14px] font-semibold text-slate-600">
                <span>Paso {step} de 4</span>
                <span>Demostración</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-primary" style={{ width: `${step * 25}%` }} />
              </div>
            </div>
          )}
          {children}
        </section>
      </main>
    </>
  );
}

function Landing({ onNavigate, onOpenDemo }) {
  return (
    <PreviewCard path="/" onNavigate={onNavigate}>
      <div className="text-center">
        <BrandMark className="mx-auto h-20 w-20 rounded-3xl" />
        <p className="eyebrow">Zynergia</p>
        <h1>Tu negocio, organizado cada día</h1>
        <p className="auth-lead">
          Sabrás a quién contactar, por qué hacerlo y qué mensaje enviar por WhatsApp.
        </p>
      </div>
      <Card className="mb-5 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-muted-foreground">Plan mensual</p>
            <p className="mt-1 text-3xl font-bold">17 USD</p>
          </div>
          <p className="pb-1 text-[15px] text-muted-foreground">precio final / mes</p>
        </div>
        <div className="mt-5 space-y-3 text-[16px]">
          {['Seguimientos y mensajes listos', 'Ventas y progreso en un solo lugar', 'Equipo y Fast Start visibles'].map(item => (
            <p key={item} className="flex items-center gap-3"><Check className="text-emerald-700" aria-hidden="true" /> {item}</p>
          ))}
        </div>
      </Card>
      <Button type="button" size="lg" className="w-full" onClick={() => onNavigate('/crear-cuenta')}>
        Probar el flujo de compra
      </Button>
      <Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white" onClick={onOpenDemo}>
        Ver directamente la app
      </Button>
    </PreviewCard>
  );
}

function Register({ onNavigate, onEmail }) {
  const [values, setValues] = useState({
    name: 'Rafael Demostración',
    email: 'demo@zynergia.pro',
    password: 'Demostracion1!',
    confirmPassword: 'Demostracion1!',
    accepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));

  const update = event => {
    const { name, type, checked, value } = event.target;
    setValues(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors(current => ({
      ...current,
      [name]: '',
      ...(name === 'password' ? { confirmPassword: '' } : {}),
    }));
  };

  const submit = event => {
    event.preventDefault();
    /** @type {Record<string, string>} */
    const nextErrors = {};
    if (values.name.trim().length < 2) nextErrors.name = 'Escribe un nombre.';
    if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = 'Escribe un correo válido.';
    if (values.password.length < 8) nextErrors.password = 'Usa al menos 8 caracteres.';
    if (!values.confirmPassword) nextErrors.confirmPassword = 'Vuelve a escribir tu contraseña.';
    else if (values.password !== values.confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden. Escríbelas igual.';
    if (!values.accepted) nextErrors.accepted = 'Marca la casilla para continuar.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onEmail(values.email);
    onNavigate('/verificar-correo');
  };

  return (
    <PreviewCard path="/crear-cuenta" onNavigate={onNavigate}>
      <p className="eyebrow !mt-0">Paso 1 · Tu cuenta</p>
      <h1>Crea tu cuenta</h1>
      <p className="auth-lead !mb-5">Escribe tus datos. En esta demostración son ficticios y no se guardan.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="demo-name">Nombre</label>
        <input id="demo-name" name="name" autoComplete="name" value={values.name} onChange={update} />
        {errors.name && <p className="form-error" role="alert">{errors.name}</p>}

        <label htmlFor="demo-email">Correo</label>
        <input id="demo-email" name="email" type="email" autoComplete="email" value={values.email} onChange={update} />
        {errors.email && <p className="form-error" role="alert">{errors.email}</p>}

        <label htmlFor="demo-password">Crea una contraseña</label>
        <div className="password-field password-field--labeled">
          <input id="demo-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={update} />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar la primera contraseña' : 'Ver la primera contraseña'}>
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}<span>{showPassword ? 'Ocultar' : 'Ver'}</span>
          </button>
        </div>
        <p className="field-help">Usa al menos 8 caracteres.</p>
        {errors.password && <p className="field-error" role="alert">{errors.password}</p>}

        <label htmlFor="demo-password-confirmation">Repite la contraseña</label>
        <div className="password-field password-field--labeled">
          <input id="demo-password-confirmation" name="confirmPassword" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={update} />
          <button type="button" onClick={() => setShowConfirmation(value => !value)} aria-label={showConfirmation ? 'Ocultar la contraseña repetida' : 'Ver la contraseña repetida'}>
            {showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}<span>{showConfirmation ? 'Ocultar' : 'Ver'}</span>
          </button>
        </div>
        {values.confirmPassword && values.password === values.confirmPassword && !errors.confirmPassword && <p className="field-match">Las contraseñas coinciden.</p>}
        {errors.confirmPassword && <p className="field-error" role="alert">{errors.confirmPassword}</p>}

        <label className="legal-check">
          <input name="accepted" type="checkbox" checked={values.accepted} onChange={update} />
          <span>Acepto los términos y la privacidad de esta demostración.</span>
        </label>
        {errors.accepted && <p className="form-error" role="alert">{errors.accepted}</p>}

        <Button type="submit" size="lg" className="mt-2 w-full">Crear cuenta de ejemplo</Button>
      </form>
    </PreviewCard>
  );
}

function Verify({ email, onNavigate }) {
  return (
    <PreviewCard path="/verificar-correo" onNavigate={onNavigate}>
      <div className="text-center">
        <div className="auth-icon"><Mail aria-hidden="true" /></div>
        <p className="eyebrow">Paso 2 · Confirma tu correo</p>
        <h1>Abre el correo que te enviamos</h1>
        <p className="auth-lead">En el flujo real lo enviaremos a <strong className="email-highlight">{email}</strong>.</p>
      </div>
      <div className="instruction-card instruction-card--block mb-3">
        <ol className="instruction-steps">
          <li>Abre tu aplicación de correo.</li>
          <li>Busca el correo de <strong>Zynergia</strong> con el asunto “Confirma tu cuenta”.</li>
          <li>Toca <strong>Confirmar mi cuenta</strong> para volver y pagar.</li>
        </ol>
      </div>
      <p className="email-help mb-4">Aquí no enviamos nada. El botón simula que ya confirmaste el correo.</p>
      <Button type="button" size="lg" className="w-full" onClick={() => onNavigate('/cuenta')}>
        Simular correo verificado
      </Button>
    </PreviewCard>
  );
}

function Payment({ email, onNavigate }) {
  return (
    <PreviewCard path="/cuenta" onNavigate={onNavigate}>
      <p className="eyebrow !mt-0">Paso 3 · Pago</p>
      <h1>Completa tu pago</h1>
      <p className="auth-lead !mb-5">Así confirmará el usuario su plan después de verificar el correo.</p>
      <Card className="p-5">
        <p className="text-[15px] text-muted-foreground">Cuenta</p>
        <p className="mt-1 break-all text-[17px] font-bold">{email}</p>
        <div className="my-5 border-t" />
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-bold">Zynergia mensual</p><p className="text-[15px] text-muted-foreground">Renovación cada mes</p></div>
          <p className="text-xl font-bold">17 USD</p>
        </div>
      </Card>
      <div className="instruction-card my-4 border border-amber-300 bg-amber-50 text-amber-950">
        <ShieldCheck aria-hidden="true" />
        <span><strong>No es un pago real.</strong> No solicitamos tarjeta ni enviamos información.</span>
      </div>
      <Button type="button" size="lg" className="w-full" onClick={() => onNavigate('/pago/exito')}>
        Ver confirmación del pago
      </Button>
      <p className="mt-3 text-center text-[14px] text-muted-foreground">Este botón no cobra nada.</p>
    </PreviewCard>
  );
}

function Success({ onNavigate }) {
  return (
    <PreviewCard path="/pago/exito" onNavigate={onNavigate}>
      <div className="text-center">
        <div className="auth-icon auth-icon--success"><CheckCircle2 aria-hidden="true" /></div>
        <p className="eyebrow">Confirmación simulada</p>
        <h1>Tu acceso está listo</h1>
        <p className="auth-lead">En producción, esta pantalla sólo aparecerá cuando el pago haya sido confirmado de forma segura.</p>
      </div>
      <Button type="button" size="lg" className="w-full" onClick={() => onNavigate('/app')}>
        Continuar
      </Button>
    </PreviewCard>
  );
}

function OpenApp({ email, onNavigate, onOpenDemo }) {
  return (
    <PreviewCard path="/app" onNavigate={onNavigate}>
      <div className="text-center">
        <div className="auth-icon"><Smartphone aria-hidden="true" /></div>
        <p className="eyebrow">Último paso · Tu teléfono</p>
        <h1>Entra a Zynergia desde tu teléfono</h1>
      </div>
      <div className="instruction-card instruction-card--block mb-4">
        <ol className="instruction-steps">
          <li>Elige tu teléfono y descarga Zynergia.</li>
          <li>Abre la app y toca <strong>Iniciar sesión</strong>.</li>
          <li>Escribe <strong>{email}</strong> y la misma contraseña que acabas de crear.</li>
        </ol>
      </div>
      <DownloadChoices className="mb-4" />
      <Button type="button" size="lg" className="w-full" onClick={onOpenDemo}>
        Abrir la app de demostración
      </Button>
      <Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white" onClick={() => onNavigate('/')}>
        Volver al inicio
      </Button>
    </PreviewCard>
  );
}

export default function DemoPurchaseFlow({ path, email, onEmail, onNavigate, onOpenDemo }) {
  if (path === '/crear-cuenta') return <Register onNavigate={onNavigate} onEmail={onEmail} />;
  if (path === '/verificar-correo') return <Verify email={email} onNavigate={onNavigate} />;
  if (path === '/cuenta') return <Payment email={email} onNavigate={onNavigate} />;
  if (path === '/pago/exito') return <Success onNavigate={onNavigate} />;
  if (path === '/app') return <OpenApp email={email} onNavigate={onNavigate} onOpenDemo={onOpenDemo} />;
  return <Landing onNavigate={onNavigate} onOpenDemo={onOpenDemo} />;
}
