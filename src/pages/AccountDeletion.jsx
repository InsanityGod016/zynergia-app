import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { createOperationId } from '@/lib/operationId';

export default function AccountDeletion() {
  const { isAuthenticated, isLoadingAuth, logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const requestDeletion = async deleteNow => {
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (signInError) throw new Error('La contraseña no es correcta.');
      const operationKey = `zynergia_delete_operation_${user.id}`;
      const operationId = sessionStorage.getItem(operationKey) || createOperationId();
      sessionStorage.setItem(operationKey, operationId);
      const data = await apiFetch('/api/account/deletion-request', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE', operation_id: operationId, delete_now: deleteNow }),
      });
      sessionStorage.removeItem(operationKey);
      setResult(data);
      setPassword('');
      if (data.status === 'completed') {
        Object.keys(localStorage)
          .filter(key => key.startsWith('zynergia_'))
          .forEach(key => localStorage.removeItem(key));
        await logout().catch(() => {});
      }
    } catch (requestError) {
      setError(requestError.message || 'No pudimos enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const completed = result.status === 'completed';
    return <main className="auth-page"><section className="auth-card auth-card--center"><div className="auth-icon auth-icon--warning"><Trash2 /></div><h1>{completed ? 'Cuenta eliminada' : 'Solicitud registrada'}</h1><p className="auth-lead">{result.executeAt ? `Tu cuenta se eliminará el ${new Intl.DateTimeFormat('es-419', { dateStyle: 'long' }).format(new Date(result.executeAt))}.` : completed ? 'Cerramos tu sesión y eliminamos los datos operativos de tu cuenta.' : 'Tu solicitud se procesará lo antes posible.'}</p><Link className="secondary-action" to={completed ? '/' : '/cuenta'}>{completed ? 'Volver a Zynergia' : 'Volver a mi cuenta'}</Link></section></main>;
  }

  if (isLoadingAuth) {
    return <main className="auth-page"><section className="auth-card auth-card--center" aria-busy="true"><Loader2 className="hero-spinner" aria-hidden="true" /><p>Revisando tu sesión…</p></section></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="legal-page">
        <Link className="back-link" to="/">← Volver a Zynergia</Link>
        <article className="legal-card" aria-labelledby="delete-title">
          <p className="eyebrow eyebrow--danger">Control de tus datos</p>
          <h1 id="delete-title">Eliminar mi cuenta</h1>
          <p>La solicitud detiene la renovación vinculada en Stripe. Puedes conservar el acceso hasta que termine tu periodo pagado o eliminar la cuenta de inmediato. El borrado inmediato termina el acceso en ese momento y no genera un reembolso automático.</p>

          <h2>Qué se elimina</h2>
          <p>Tu cuenta de autenticación y la información operativa asociada: perfil, contactos, tareas, ventas, socios, etiquetas, enlaces, plantillas, avisos y preferencias.</p>

          <h2>Qué puede conservarse</h2>
          <p>Podemos conservar temporalmente registros mínimos de seguridad, respaldo o cumplimiento. Stripe y Zynergia pueden conservar registros de transacciones cuando sean necesarios por obligaciones fiscales, contables, contracargos o la ley.</p>

          <h2>Solicitar la eliminación</h2>
          <p>Inicia sesión para verificar que la cuenta es tuya. Después volverás automáticamente a esta página para confirmar con tu contraseña.</p>
          <Link className="danger-action" to="/iniciar-sesion?returnTo=%2Feliminar-cuenta">Iniciar sesión y continuar</Link>
          <Link className="secondary-action" to="/soporte">Necesito ayuda</Link>

          <p>El borrado es irreversible cuando se ejecuta. Consulta también el <Link to="/privacidad">Aviso de privacidad</Link>.</p>
        </article>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="delete-title">
        <Link className="back-link" to="/cuenta">← Volver</Link>
        <p className="eyebrow eyebrow--danger">Acción irreversible</p>
        <h1 id="delete-title">Eliminar mi cuenta</h1>
        <p className="auth-lead">Se cancelará tu renovación. Elige si quieres conservar el acceso pagado restante o eliminar todo ahora.</p>
        <form className="auth-form" onSubmit={event => event.preventDefault()}>
          <label htmlFor="delete-password">Escribe tu contraseña para confirmar</label>
          <input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="secondary-action" type="button" onClick={() => requestDeletion(false)} disabled={loading || !password}>
            {loading && <Loader2 className="spinner" />}{loading ? 'Enviando…' : 'Eliminar al terminar mi periodo'}
          </button>
          <p className="field-help">Conservas el acceso pagado restante; si no existe un periodo vigente, se elimina ahora.</p>
          <button className="danger-action" type="button" onClick={() => requestDeletion(true)} disabled={loading || !password}>
            {loading && <Loader2 className="spinner" />}{loading ? 'Eliminando…' : 'Eliminar ahora'}
          </button>
          <p className="field-error">Tu acceso termina de inmediato. Esta opción no genera un reembolso automático.</p>
        </form>
      </section>
    </main>
  );
}
