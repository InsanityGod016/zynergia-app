import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, CreditCard, Loader2, LogOut, TriangleAlert } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import BrandMark from '@/components/ui/BrandMark';
import { apiFetch, clearCheckoutIdempotencyKey, getCheckoutIdempotencyKey } from '@/lib/api';
import {
  billingAccessEndsAt,
  cancellationEndsImmediately,
  hasAppAccess,
  resolveBillingStatus,
} from '@/lib/subscription';
import { useAuth } from '@/lib/AuthContext';

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('es-419', { dateStyle: 'long' }).format(new Date(value));
}

export default function Account() {
  const { isAuthenticated, isLoadingAuth, logout, user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStatus(await resolveBillingStatus());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (hasAppAccess(status)) clearCheckoutIdempotencyKey();
  }, [status]);

  const active = hasAppAccess(status);
  const needsPayment = !active;
  const subscriptionStatus = status?.subscriptionStatus || status?.state;
  const paymentRecoveryNeeded = status?.state === 'grace' || subscriptionStatus === 'past_due';
  const unpaid = subscriptionStatus === 'unpaid';
  const cancellationEndsNow = cancellationEndsImmediately(status);
  const periodEnd = formatDate(billingAccessEndsAt(status));
  const accountHeading = active
    ? `Hola, ${user?.user_metadata?.full_name || user?.email}`
    : unpaid
      ? 'Tu suscripción necesita atención'
      : paymentRecoveryNeeded
        ? 'Revisa tu pago'
        : 'Completa tu pago';
  const accountLead = active
    ? 'Aquí puedes revisar tu acceso y administrar tu suscripción.'
    : unpaid
      ? 'Stripe detuvo los reintentos. Puedes cerrar esta suscripción o pedir ayuda antes de iniciar un pago nuevo.'
      : paymentRecoveryNeeded
        ? 'Tu cuenta sigue guardada. Actualiza tu tarjeta para recuperar el acceso.'
        : 'Tu cuenta y tu correo ya están listos. Paga 17 USD al mes y después descarga Zynergia en tu teléfono.';

  if (!isLoadingAuth && !isAuthenticated) return <Navigate to="/iniciar-sesion" replace />;

  const startCheckout = async () => {
    setWorking('checkout');
    setError('');
    try {
      const data = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': getCheckoutIdempotencyKey() },
        body: JSON.stringify({}),
      });
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError.message);
      setWorking('');
    }
  };

  const openPortal = async () => {
    setWorking('portal');
    setError('');
    try {
      const data = await apiFetch('/api/billing/portal', { method: 'POST' });
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError.message);
      setWorking('');
    }
  };

  const cancelRenewal = async () => {
    const confirmed = window.confirm(
      cancellationEndsNow
        ? 'Detendremos los siguientes intentos de cobro y tu acceso terminará al confirmar. No borraremos tu cuenta ni tus datos. ¿Cancelar la suscripción?'
        : `No habrá reembolso. Podrás seguir usando Zynergia ${periodEnd ? `hasta el ${periodEnd}` : 'hasta terminar el periodo que ya pagaste'}. ¿Cancelar la próxima renovación?`
    );
    if (!confirmed) return;

    setWorking('cancel');
    setError('');
    try {
      setStatus(await apiFetch('/api/billing/cancel', { method: 'POST' }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking('');
    }
  };

  if (loading || isLoadingAuth) {
    return <main className="auth-page"><div className="status-panel"><Loader2 className="spinner" /><p>Revisando tu cuenta…</p></div></main>;
  }

  return (
    <main className="account-page">
      <header className="web-header">
        <Link to="/" className="web-brand"><BrandMark className="web-brand__mark" /> Zynergia</Link>
        <button type="button" className="header-action" onClick={logout}><LogOut /> Cerrar sesión</button>
      </header>

      <section className="account-content" aria-labelledby="account-title">
        <p className="eyebrow">{needsPayment && !unpaid && !paymentRecoveryNeeded ? 'Paso 3 de 4 · Pago' : 'Mi cuenta'}</p>
        <h1 id="account-title">{accountHeading}</h1>
        <p className="account-lead">{accountLead}</p>

        {error && (
          <div className="state-card state-card--error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <div><strong>No pudimos cargar tu cuenta</strong><p>{error}</p></div>
            <button type="button" onClick={refresh}>Intentar de nuevo</button>
          </div>
        )}

        {!error && (
          <div className="billing-card">
            <div className={`billing-status ${active ? 'billing-status--active' : ''}`}>
              {active ? <CheckCircle2 aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
              <div>
                <span>Estado</span>
                <strong>{status?.label || (active ? 'Acceso activo' : 'Sin suscripción activa')}</strong>
              </div>
            </div>

            {periodEnd && (
              <div className="billing-detail"><CalendarDays aria-hidden="true" /><span>Acceso hasta <strong>{periodEnd}</strong></span></div>
            )}

            {status?.state === 'grace' && (
              <p className="billing-warning">No pudimos cobrar la renovación. Conservas acceso durante tres días.</p>
            )}
            {status?.state === 'pending_deletion' && (
              <p className="billing-warning">Tu cuenta se eliminará al terminar el periodo pagado.</p>
            )}
            {status?.cancelAtPeriodEnd && status?.state !== 'pending_deletion' && (
              <p className="billing-success">
                Tu renovación está cancelada. No habrá otro cobro y conservarás acceso {periodEnd ? `hasta el ${periodEnd}` : 'hasta terminar el periodo pagado'}.
              </p>
            )}

            {!active && status?.canCheckout !== false && (
              <button type="button" className="primary-action" onClick={startCheckout} disabled={!!working}>
                {working === 'checkout' && <Loader2 className="spinner" />}
                Continuar al pago — 17 USD/mes
              </button>
            )}
            {!active && status?.canCheckout === false && !paymentRecoveryNeeded && !unpaid && (
              <p className="billing-warning">Las altas nuevas están pausadas temporalmente mientras verificamos las cuentas existentes. No realizaremos ningún cobro.</p>
            )}
            {paymentRecoveryNeeded && status?.state !== 'grace' && (
              <p className="billing-warning">Tu pago está pendiente. Actualiza tu tarjeta para recuperar el acceso.</p>
            )}
            {unpaid && (
              <p className="billing-warning">Stripe detuvo los reintentos de esta suscripción. Cancélala para cerrar ese ciclo o contacta a soporte; después podrás iniciar un pago nuevo cuando las altas estén disponibles.</p>
            )}
            {status?.canUpdatePaymentMethod && (
              <button type="button" className="secondary-action" onClick={openPortal} disabled={!!working}>
                {working === 'portal' && <Loader2 className="spinner" />}
                Actualizar tarjeta
              </button>
            )}
            {status?.canCancelSubscription && (
              <button type="button" className="danger-link" onClick={cancelRenewal} disabled={!!working}>
                {working === 'cancel' ? 'Cancelando renovación…' : 'Cancelar mi suscripción'}
              </button>
            )}
          </div>
        )}

        <nav className="account-links" aria-label="Ayuda y cuenta">
          <Link to="/app">Descargar la app</Link>
          <Link to="/soporte">Ayuda y soporte</Link>
          <Link to="/eliminar-cuenta">Eliminar mi cuenta</Link>
        </nav>
      </section>
    </main>
  );
}
