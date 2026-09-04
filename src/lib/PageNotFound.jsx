import { Link, useLocation } from 'react-router-dom';

export default function PageNotFound({ homePath = '/' }) {
  const location = useLocation();

  return (
    <main className="app-state app-state--card">
      <p className="eyebrow">Error 404</p>
      <h1>No encontramos esa pantalla</h1>
      <p>La dirección <strong>{location.pathname}</strong> no existe o ya cambió.</p>
      <Link className="primary-action" to={homePath}>Volver al inicio</Link>
    </main>
  );
}
