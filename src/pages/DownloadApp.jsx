import { CheckCircle2, Smartphone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_STORE_URL, PLAY_STORE_URL, qrFor } from '@/lib/app-links';

/**
 * Pantalla post-registro: la cuenta ya está creada y la sesión iniciada.
 * Invita a descargar la app (QRs en desktop, botones en móvil) o a seguir
 * en el navegador. Si las URLs de las stores aún no existen, solo muestra
 * el botón de continuar.
 */
export default function DownloadApp() {
  const hasStores = !!(APP_STORE_URL || PLAY_STORE_URL);

  const stores = [
    APP_STORE_URL && { name: 'App Store', sub: 'iPhone', url: APP_STORE_URL },
    PLAY_STORE_URL && { name: 'Google Play', sub: 'Android', url: PLAY_STORE_URL },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-lg w-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
        >
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </motion.div>

        <h1 className="text-[26px] font-bold text-[#0F172A] mb-2">¡Tu cuenta está lista!</h1>
        <p className="text-[15px] text-[#64748B] leading-relaxed mb-8">
          {hasStores
            ? 'Descarga la app de Zynergia e inicia sesión con tu correo y la contraseña que acabas de crear.'
            : 'Ya puedes usar Zynergia con tu correo y la contraseña que acabas de crear.'}
        </p>

        {hasStores && (
          <div className={`grid gap-4 mb-8 ${stores.length === 2 ? 'sm:grid-cols-2' : ''}`}>
            {stores.map(store => (
              <a
                key={store.name}
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm hover:border-[#004AFE] transition-colors block"
              >
                {/* QR visible en pantallas grandes (pagaron desde la compu) */}
                <img
                  src={qrFor(store.url)}
                  alt={`QR ${store.name}`}
                  className="hidden sm:block w-36 h-36 mx-auto mb-3 rounded-lg"
                />
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#004AFE]" />
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-[#0F172A]">{store.name}</p>
                    <p className="text-[12px] text-[#94A3B8]">{store.sub}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <button
          onClick={() => window.location.replace('/')}
          className={`w-full max-w-sm mx-auto py-4 font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${
            hasStores
              ? 'bg-white border border-[#E2E8F0] text-[#0F172A]'
              : 'bg-[#004AFE] text-white'
          }`}
        >
          Continuar en el navegador
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
