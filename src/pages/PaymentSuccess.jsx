import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clearCheckoutIdempotencyKey } from '@/lib/api';
import { getBillingStatus, hasAppAccess } from '@/lib/subscription';

export default function PaymentSuccess() {
  const [state, setState] = useState('waiting');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer;

    const check = async () => {
      try {
        const status = await getBillingStatus();
        if (cancelled) return;
        if (hasAppAccess(status)) {
          clearCheckoutIdempotencyKey();
          setState('ready');
          return;
        }
      } catch {
        // The next poll retries; the redirect itself never grants access.
      }

      attempts += 1;
      if (attempts >= 45) setState('delayed');
      else timer = window.setTimeout(check, 2000);
    };

    check();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--center">
        {state === 'waiting' && <><Loader2 className="hero-spinner" /><h1>Confirmando tu pago</h1><p className="auth-lead">Estamos esperando la confirmación segura de Stripe. Esto suele tardar sólo unos segundos.</p></>}
        {state === 'ready' && <><div className="auth-icon auth-icon--success"><CheckCircle2 /></div><p className="eyebrow">Pago confirmado</p><h1>Tu acceso está listo</h1><p className="auth-lead">Falta un último paso: descarga Zynergia y entra con el correo y la contraseña que acabas de crear.</p><Link className="primary-action" to="/app">Ir al último paso</Link></>}
        {state === 'delayed' && <><div className="auth-icon auth-icon--warning"><TriangleAlert /></div><h1>Seguimos confirmando</h1><p className="auth-lead">Aún no podemos confirmar tu acceso. No intentes pagar otra vez; revisa tu cuenta en unos minutos o solicita ayuda.</p><Link className="secondary-action" to="/cuenta">Volver a mi cuenta</Link></>}
      </section>
    </main>
  );
}
