import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function AccountDeletion() {
  const { isAuthenticated, isLoadingAuth, logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const requestDeletion = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (signInError) throw new Error('La contraseña no es correcta.');
      const operationKey = `zynergia_delete_operation_${user.id}`;
      const operationId = sessionStorage.getItem(operationKey) || crypto.randomUUID();
      sessionStorage.setItem(operationKey, operationId);
      const data = await apiFetch('/api/account/deletion-request', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE', operation_id: operationId }),
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
          <p>La solicitud detiene la renovación vinculada en Stripe. Si tienes un periodo pagado vigente, conservarás el acceso hasta que termine y programaremos el borrado para esa fecha. Sin periodo vigente, el borrado se procesa de inmediato.</p>

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
        <p className="auth-lead">Se cancelará tu renovación. Si tienes un periodo pagado, conservarás acceso hasta que termine y después eliminaremos tus datos.</p>
        <form className="auth-form" onSubmit={requestDeletion}>
          <label htmlFor="delete-password">Escribe tu contraseña para confirmar</label>
          <input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="danger-action" type="submit" disabled={loading || !password}>
            {loading && <Loader2 className="spinner" />}{loading ? 'Enviando…' : 'Eliminar mi cuenta'}
          </button>
        </form>
      </section>
    </main>
  );
}
