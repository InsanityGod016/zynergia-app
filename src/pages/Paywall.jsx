import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Crown, RefreshCw, X } from 'lucide-react';
import { purchasePackage, restorePurchases, getOfferings } from '@/lib/subscription';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const FEATURES = [
  'Contactos y seguimiento ilimitados',
  'Tareas automáticas de seguimiento',
  'Control de ventas y gráficas',
  'Programa Fast Start para socios',
  'Generador de QR personalizado',
  'Plantillas de mensajes WhatsApp',
  'Notificaciones inteligentes',
];

const PLANS = [
  {
    id: 'monthly',
    label: 'Mensual',
    price: '$17',
    period: '/mes',
    description: 'Ideal para empezar',
    badge: null,
    priceMonthly: 17,
  },
  {
    id: 'annual',
    label: 'Anual',
    price: '$170',
    period: '/año',
    description: '≈ $14.17/mes',
    badge: 'Ahorra 17%',
    priceMonthly: 14.17,
  },
];

export default function Paywall({ onSubscribed }) {
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { data: offerings } = useQuery({
    queryKey: ['offerings'],
    queryFn: getOfferings,
    retry: false,
  });

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // If RevenueCat offerings are available, use real packages
      if (offerings?.availablePackages?.length > 0) {
        const pkg = offerings.availablePackages.find(p =>
          selectedPlan === 'monthly'
            ? p.packageType === 'MONTHLY'
            : p.packageType === 'ANNUAL'
        ) || offerings.availablePackages[0];

        const success = await purchasePackage(pkg);
        if (success) {
          toast.success('¡Suscripción activada!');
          onSubscribed?.();
        }
      } else {
        // Web/dev mode — proceed directly
        toast.success('Modo demo: acceso habilitado');
        onSubscribed?.();
      }
    } catch (err) {
      if (err?.code !== 'PURCHASE_CANCELLED') {
        toast.error('No se pudo procesar el pago. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) {
        toast.success('Suscripción restaurada');
        onSubscribed?.();
      } else {
        toast.error('No se encontró una suscripción activa');
      }
    } catch {
      toast.error('Error al restaurar. Intenta de nuevo.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-[#004AFE]" />
        </div>
        <h1 className="text-[26px] font-bold text-[#0F172A]">Zynergia Premium</h1>
        <p className="text-[15px] text-[#64748B] mt-1">Acceso completo a todas las funciones</p>
      </div>

      {/* Features */}
      <div className="px-6 mb-6">
        <div className="bg-[#F8FAFC] rounded-2xl p-5 space-y-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-[#004AFE] shrink-0" />
              <span className="text-[15px] text-[#0F172A]">{f}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="px-6 mb-6 space-y-3">
        {PLANS.map(plan => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              selectedPlan === plan.id
                ? 'border-[#004AFE] bg-[#EEF2FF]'
                : 'border-[#E2E8F0] bg-white'
            }`}
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[16px] text-[#0F172A]">{plan.label}</span>
                {plan.badge && (
                  <span className="text-[11px] font-bold text-white bg-[#004AFE] px-2 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                )}
              </div>
              <span className="text-[13px] text-[#64748B]">{plan.description}</span>
            </div>
            <div className="text-right">
              <span className="text-[22px] font-bold text-[#0F172A]">{plan.price}</span>
              <span className="text-[13px] text-[#64748B]">{plan.period}</span>
            </div>
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6 space-y-3 mt-auto">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            `Suscribirme — ${selectedPlan === 'monthly' ? '$17/mes' : '$170/año'}`
          )}
        </button>

        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full py-3 flex items-center justify-center gap-2 text-[#64748B] text-[14px]"
        >
          <RefreshCw className={`w-4 h-4 ${restoring ? 'animate-spin' : ''}`} />
          Restaurar compra
        </button>

        <p className="text-center text-[11px] text-[#94A3B8] leading-relaxed px-4">
          El pago se realiza a través de tu cuenta de App Store o Google Play.
          La suscripción se renueva automáticamente. Puedes cancelar en cualquier momento.
        </p>
      </div>
    </div>
  );
}
