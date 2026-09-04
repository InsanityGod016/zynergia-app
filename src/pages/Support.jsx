import { Link } from 'react-router-dom';

const configuredEmail = String(import.meta.env.VITE_SUPPORT_EMAIL || 'equipo@coreflowia.com').trim();
const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail)
  ? configuredEmail
  : '';

export default function Support() {
  return (
    <main className="legal-page">
      <Link className="back-link" to="/cuenta">← Volver a mi cuenta</Link>
      <article className="legal-card">
        <p className="eyebrow">Ayuda</p>
        <h1>Soporte de Zynergia</h1>
        <p>Cuéntanos qué estabas intentando hacer y qué apareció en pantalla. Nunca envíes tu contraseña ni datos completos de tu tarjeta.</p>
        {supportEmail ? (
          <a className="primary-action" href={`mailto:${supportEmail}?subject=Ayuda%20con%20Zynergia`}>Escribir a soporte</a>
        ) : (
          <p className="instruction-card" role="status">El canal de soporte se publicará aquí antes del lanzamiento.</p>
        )}
        <h2>Suscripción</h2>
        <p>Puedes cancelar la renovación desde Configuración en la app o desde tu cuenta web. Conservas acceso hasta terminar el periodo pagado.</p>
        <h2>Cuenta y datos</h2>
        <p>Puedes solicitar la eliminación desde Ajustes en la app o desde la página <Link to="/eliminar-cuenta">Eliminar cuenta</Link>.</p>
      </article>
    </main>
  );
}
