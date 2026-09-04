import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { X, Smartphone, Share2, CheckCircle2, Lock, TrendingUp, AlertTriangle, Hash, Loader2, CircleHelp } from 'lucide-react';
import { formatBonus } from './bonusTable';
import { calculateFastStartProgress } from './partnerEngine';

function ProgressRow({ label, subtitle, amount, status, current = null, target = null, detail }) {
  const cfg = {
    completado:  { bg: '#D1FAE5', color: '#065F46', Icon: CheckCircle2, label: 'Listo' },
    en_progreso: { bg: '#EEF2FF', color: '#004AFE', Icon: TrendingUp,   label: 'En progreso' },
    en_riesgo:   { bg: '#FEF3C7', color: '#92400E', Icon: AlertTriangle, label: 'En riesgo' },
    bloqueado:   { bg: '#F1F5F9', color: '#94A3B8', Icon: Lock,          label: 'Bloqueado' },
    sin_datos:   { bg: '#FEF3C7', color: '#92400E', Icon: CircleHelp,    label: 'Sin datos' },
  }[status] || { bg: '#F1F5F9', color: '#94A3B8', Icon: Lock, label: status };

  const statusText = detail || (status === 'completado'
    ? 'Etapa marcada como completada con los datos registrados.'
    : status === 'bloqueado'
      ? 'Continúa con la etapa anterior antes de revisar esta.'
      : status === 'en_riesgo'
        ? 'Conviene revisar esta etapa con tu equipo.'
        : 'Esta etapa sigue en progreso.');
  const hasCount = Number.isFinite(current) && Number.isFinite(target) && target > 0 && status !== 'sin_datos';

  return (
    <div className={`rounded-2xl border p-3.5 ${status === 'bloqueado' ? 'border-[#CBD5E1] bg-[#F8FAFC]' : status === 'completado' ? 'border-[#22C55E]' : 'border-[#E2E8F0]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-[#475569]">{subtitle}</p>
          <p className="text-[15px] font-bold text-[#0F172A]">{label}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[17px] font-bold text-[#004AFE]">{amount}</span>
          <span
            className="flex items-center gap-1 text-[15px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            <cfg.Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {cfg.label}
          </span>
        </div>
      </div>
      {hasCount && status !== 'bloqueado' && (
        <>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]" role="progressbar" aria-label={`${current} de ${target}`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(current, target)}>
            <div className="h-full rounded-full bg-[#004AFE] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.min(100, Math.round((current / target) * 100))}%` }} />
          </div>
          <p className="mt-2 text-[15px] font-bold text-[#0F172A]">{current} de {target}</p>
        </>
      )}
      <p className={`${hasCount && status !== 'bloqueado' ? 'mt-1' : ''} text-[15px] leading-relaxed text-[#475569]`}>{statusText}</p>
    </div>
  );
}

export default function PartnerDetailSheet({
  isOpen,
  onClose,
  partner,
  contact,
  activityStatus,
  fastStartMetrics,
  metricsLoading = false,
  metricsError = false,
  currency = 'MXN',
}) {
  const hasApp = !!partner?.partner_user_id;
  const isInactive = activityStatus === 'inactivo';
  const queryClient = useQueryClient();

  const [codeInput, setCodeInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const lookupRequest = useRef(0);

  const handleCodeInput = (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCodeInput(v);
    setFoundUser(null);
    setCodeError('');
  };

  useEffect(() => {
    const requestId = ++lookupRequest.current;
    if (!isOpen || hasApp || codeInput.length < 4) {
      setCodeLoading(false);
      return undefined;
    }

    setCodeLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('lookup_partner_code', { code: codeInput });
        if (requestId !== lookupRequest.current) return;
        if (error) throw error;
        if (data?.length) setFoundUser({ user_id: data[0].found_user_id, user_name: data[0].found_user_name });
        else setCodeError('Código no encontrado. Revísalo e intenta de nuevo.');
      } catch {
        if (requestId === lookupRequest.current) setCodeError('No pudimos buscar el código. Intenta de nuevo.');
      } finally {
        if (requestId === lookupRequest.current) setCodeLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [codeInput, hasApp, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    lookupRequest.current += 1;
    setCodeInput('');
    setFoundUser(null);
    setCodeError('');
    setCodeLoading(false);
  }, [isOpen]);

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('link_existing_partner_by_code', {
        p_partner_id: partner.id,
        p_code: codeInput,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('¡Partner vinculado con la app!');
      setCodeInput('');
      setFoundUser(null);
      onClose();
    },
    onError: () => toast.error('No se pudo vincular'),
  });

  // The leader may only receive the aggregate Fast Start snapshot. Never load
  // a partner's private contacts or sales into this sheet.
  const isLoading = hasApp && metricsLoading;
  const activePremierClients = hasApp && Number.isFinite(fastStartMetrics?.premier_clients)
    ? fastStartMetrics.premier_clients
    : 0;
  const partnersCount = hasApp && Number.isFinite(fastStartMetrics?.partners_count)
    ? fastStartMetrics.partners_count
    : 0;
  const directBranches = Array.isArray(fastStartMetrics?.direct_branches)
    ? fastStartMetrics.direct_branches.map(branch => ({
      premierClients: Number.isFinite(branch?.premier_clients) ? branch.premier_clients : null,
    }))
    : [];
  const progress = hasApp ? calculateFastStartProgress({
    premierClients: activePremierClients,
    directPartners: partnersCount,
    directBranches,
    startDate: fastStartMetrics?.fast_start_started_at || null,
  }) : null;
  const daysIn = progress?.timeline?.daysElapsed ?? null;
  const daysRemaining = progress?.timeline?.daysRemaining ?? null;
  const retryMetrics = () => queryClient.invalidateQueries({ queryKey: ['partners_fs_metrics'] });

  const handleShare = async () => {
    const text = 'Únete a mi equipo en Zynergia. Descarga la app para hacer mejor tracking de tu negocio.';
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Invitación copiada');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('No pudimos compartir. Intenta de nuevo.');
    }
  };

  if (!partner) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-detail-title"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
              <div>
                <h3 id="partner-detail-title" className="text-[18px] font-bold text-[#0F172A]">{contact?.full_name || 'Partner'}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {hasApp && !isInactive && <span className="flex items-center gap-1 text-[15px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full"><Smartphone className="w-3.5 h-3.5" aria-hidden="true" />Activo en app</span>}
                  {isInactive && <span className="text-[15px] font-semibold text-[#B91C1C] bg-[#FEE2E2] px-2 py-0.5 rounded-full">Inactivo</span>}
                  {!hasApp && <span className="text-[15px] font-semibold text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded-full">No vinculado</span>}
                </div>
              </div>
              <button type="button" onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F1F5F9]" aria-label="Cerrar">
                <X className="w-5 h-5 text-[#475569]" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Fast Start header card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#004AFE] to-[#0039CC] p-4 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold">Fast Start</p>
                </div>
                {!hasApp ? (
                  <p className="mt-2 text-[15px] text-blue-100">Vincula su cuenta para consultar su avance real.</p>
                ) : daysIn == null ? (
                  <p className="mt-2 text-[15px] text-blue-100">Su fecha de inicio todavía no está disponible.</p>
                ) : (
                  <p className="mt-2 text-[15px] text-blue-100">Día {Math.min(daysIn, 120)} de 120{daysRemaining == null ? '' : ` · ${daysRemaining} días restantes`}</p>
                )}
              </div>

              {hasApp ? (
                isLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-[#004AFE] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : metricsError ? (
                  <div className="rounded-2xl bg-red-50 p-4 text-[15px] text-red-800" role="alert">
                    <p className="font-bold">No pudimos cargar su progreso.</p>
                    <p className="mt-1">No inventamos datos. Revisa tu conexión e intenta de nuevo.</p>
                    <button type="button" onClick={retryMetrics} className="mt-3 min-h-12 rounded-xl bg-white px-4 font-semibold text-[#004AFE]">Intentar de nuevo</button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[15px] font-semibold text-[#475569]">Progreso Fast Start</p>
                    <ProgressRow label="Q-Team" subtitle="Meta día 30" amount={formatBonus('qteam', currency)} status={progress.stages.qteam.status} current={activePremierClients} target={4} detail={progress.stages.qteam.completed ? 'Meta registrada.' : `Le faltan ${Math.max(0, 4 - activePremierClients)} clientes Premier.`} />
                    <ProgressRow label="Fast Start Nivel 1" subtitle="Meta día 60" amount={formatBonus('fs_nivel1', currency)} status={progress.stages.fs_nivel1.status} current={partnersCount} target={2} detail={!progress.stages.qteam.completed ? 'Primero necesita completar Q-Team.' : progress.stages.fs_nivel1.completed ? 'Meta registrada.' : `Le faltan ${Math.max(0, 2 - partnersCount)} partners.`} />
                    <ProgressRow label="Fast Start Nivel 2" subtitle="Meta día 90" amount={formatBonus('fs_nivel2', currency)} status={progress.stages.fs_nivel2.status} current={progress.stages.fs_nivel2.current} target={2} detail={!progress.stages.fs_nivel1.completed ? 'Primero necesita completar el Nivel 1.' : progress.stages.fs_nivel2.completed ? 'Dos ramas directas tienen Q-Team verificado.' : progress.stages.fs_nivel2.status === 'sin_datos' ? 'No recibimos métricas verificadas de todas sus ramas directas; no mostramos progreso inventado.' : `Le faltan ${Math.max(0, 2 - progress.stages.fs_nivel2.current)} ramas con Q-Team.`} />
                    <ProgressRow label="X-Team" subtitle="Meta día 120" amount={formatBonus('xteam', currency)} status={progress.stages.xteam.status} current={activePremierClients} target={10} detail={!progress.stages.fs_nivel1.completed ? 'Primero necesita completar el Nivel 1.' : progress.stages.xteam.completed ? 'Meta registrada.' : `Le faltan ${Math.max(0, 10 - activePremierClients)} clientes Premier.`} />
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {/* Invitar a descargar */}
                  <div className="bg-[#EEF2FF] rounded-2xl p-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#004AFE] flex items-center justify-center mx-auto mb-2">
                      <Smartphone className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    <p className="text-[15px] font-bold text-[#0F172A] mb-1">Tu partner aún no tiene la app</p>
                    <p className="text-[15px] text-[#475569] mb-3">Invítalo a descargar Zynergia para ver su progreso en tiempo real.</p>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="min-h-12 flex items-center justify-center gap-2 mx-auto px-5 py-2.5 bg-[#004AFE] text-white text-[15px] font-semibold rounded-xl active:scale-95 transition-transform"
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      Invitar a Zynergia
                    </button>
                  </div>

                  {/* Vincular por código */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
                    <p className="text-[15px] font-bold text-[#0F172A] mb-1">¿Ya tiene la app?</p>
                    <p className="text-[15px] text-[#475569] mb-3">Ingresa su código de partner para vincular su cuenta y ver sus métricas.</p>
                    <div className="relative mb-2">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Hash className="w-4 h-4 text-[#94A3B8]" aria-hidden="true" />
                      </div>
                      <input
                        type="text"
                        value={codeInput}
                        onChange={e => handleCodeInput(e.target.value)}
                        placeholder="Ej: PEPE23"
                        autoCapitalize="characters"
                        className="w-full min-h-14 pl-9 pr-10 py-3 rounded-xl border border-[#CBD5E1] text-[17px] font-bold text-[#004AFE] tracking-widest placeholder:text-[#64748B] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-[#004AFE] uppercase"
                        aria-label="Código de partner"
                      />
                      {codeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 text-[#004AFE] animate-spin" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    {foundUser && (
                      <div className="flex items-center justify-between bg-[#F0FDF4] rounded-xl px-3 py-2 border border-[#86EFAC] mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                          <p className="text-[15px] font-semibold text-[#15803D]">{foundUser.user_name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => linkMutation.mutate()}
                          disabled={linkMutation.isPending}
                          className="min-h-12 px-3 py-2 bg-[#15803D] text-white text-[15px] font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-60"
                        >
                          {linkMutation.isPending ? '...' : 'Vincular'}
                        </button>
                      </div>
                    )}
                    {codeError && codeInput.length >= 4 && !codeLoading && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[15px] text-amber-950" role="alert">{codeError}</p>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
