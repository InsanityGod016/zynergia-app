import { Smartphone } from 'lucide-react';
import DownloadChoices from '@/components/DownloadChoices';
import { useAuth } from '@/lib/AuthContext';

export default function DownloadApp() {
  const { user } = useAuth();
  const email = user?.email || sessionStorage.getItem('zynergia_verification_email') || '';

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--center app-download" aria-labelledby="app-title">
        <div className="auth-icon"><Smartphone aria-hidden="true" /></div>
        <p className="eyebrow">Paso 4 de 4 · Tu teléfono</p>
        <h1 id="app-title">Entra a Zynergia desde tu teléfono</h1>
        <div className="instruction-card instruction-card--block">
          <ol className="instruction-steps">
            <li>Elige tu teléfono y descarga Zynergia.</li>
            <li>Abre la app y toca <strong>Iniciar sesión</strong>.</li>
            <li>
              Escribe {email ? <><strong>{email}</strong> y la misma contraseña que acabas de crear.</> : <>el mismo correo y contraseña que acabas de crear.</>}
            </li>
          </ol>
        </div>
        <p className="email-help">Si tu teléfono ofrece guardar la contraseña, toca <strong>Guardar</strong>.</p>

        <DownloadChoices />
      </section>
    </main>
  );
}
