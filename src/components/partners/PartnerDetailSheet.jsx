import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/api/db';
import { toast } from 'sonner';
import { X, Smartphone, Share2, CheckCircle2, Lock, TrendingUp, AlertTriangle, Hash, Loader2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { DEFAULT_PRODUCTS } from '@/lib/defaultProducts';
import { BONUS_TABLE, formatBonus } from './bonusTable';

function productId(name) {
  return 'prod_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const PREMIER_KIT_IDS = new Set(
  DEFAULT_PRODUCTS.filter(p => p.category === 'Premier Kits').map(p => productId(p.name))
);

function ProgressBar({ value, max, color = '#004AFE' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function BonusRow({ label, subtitle, amount, status, current, target }) {
  const cfg = {
    completado:  { bg: '#D1FAE5', color: '#065F46', Icon: CheckCircle2, label: 'Listo' },
    en_progreso: { bg: '#EEF2FF', color: '#004AFE', Icon: TrendingUp,   label: 'En progreso' },
    en_riesgo:   { bg: '#FEF3C7', color: '#92400E', Icon: AlertTriangle, label: 'En riesgo' },
    bloqueado:   { bg: '#F1F5F9', color: '#94A3B8', Icon: Lock,          label: 'Bloqueado' },
  }[status] || { bg: '#F1F5F9', color: '#94A3B8', Icon: Lock, label: status };

  const barColor = status === 'completado' ? '#22C55E' : status === 'en_riesgo' ? '#F59E0B' : '#004AFE';

  return (
    <div className={`rounded-2xl border p-3.5 ${status === 'bloqueado' ? 'opacity-50 border-[#E2E8F0]' : status === 'completado' ? 'border-[#22C55E]' : 'border-[#E2E8F0]'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
          <p className="text-[14px] font-bold text-[#0F172A]">{label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[16px] font-bold text-[#004AFE]">{amount}</span>
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            <cfg.Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>
      </div>
      {status !== 'bloqueado' && (
        <>
          <ProgressBar value={current} max={target} color={barColor} />
          <p className="text-[11px] text-[#94A3B8] mt-1">{current} / {target}</p>
        </>
      )}
    </div>
  );
}

export default function PartnerDetailSheet({ isOpen, onClose, partner, contact, activityStatus, currency = 'MXN' }) {
  const hasApp = !!partner?.partner_user_id;
  const isInactive = activityStatus === 'inactivo';
  const queryClient = useQueryClient();

  const [codeInput, setCodeInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const handleCodeInput = async (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCodeInput(v);
    setFoundUser(null);
    if (v.length < 4) return;
    setCodeLoading(true);
    try {
      const { data } = await supabase.rpc('lookup_partner_code', { code: v });
      if (data && data.length > 0) setFoundUser({ user_id: data[0].found_user_id, user_name: data[0].found_user_name });
    } catch {}
    setCodeLoading(false);
  };

  const linkMutation = useMutation({
    mutationFn: () => db.Partner.update(partner.id, { partner_user_id: foundUser.user_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('¡Partner vinculado con la app!');
      setCodeInput('');
      setFoundUser(null);
      onClose();
    },
    onError: () => toast.error('No se pudo vincular'),
  });

  const { data: salesData = [], isLoading: loadingSales } = useQuery({
    queryKey: ['partner_sales', partner?.partner_user_id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_partner_sales_data', { p_user_id: partner.partner_user_id });
      return data || [];
    },
    enabled: isOpen && hasApp,
  });

  const { data: partnersCount = 0, isLoading: loadingPartners } = useQuery({
    queryKey: ['partner_partners_count', partner?.partner_user_id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_partner_partners_count', { p_user_id: partner.partner_user_id });
      return data || 0;
    },
    enabled: isOpen && hasApp,
  });

  const isLoading = loadingSales || loadingPartners;

  // Compute metrics same as FastStartDashboard
  const activePremierClients = hasApp ? new Set(
    salesData.filter(s => s.status !== 'cancelled' && PREMIER_KIT_IDS.has(s.product_id)).map(s => s.contact_id)
  ).size : 0;

  const qteamDone  = activePremierClients >= 4;
  const fs1Done    = qteamDone && partnersCount >= 2;
  const xteamDone  = qteamDone && activePremierClients >= 10;

  const qteamStatus  = activePremierClients >= 4 ? 'completado' : 'en_progreso';
  const fs1Status    = !qteamDone ? 'bloqueado' : partnersCount >= 2 ? 'completado' : 'en_progreso';
  const fs2Status    = !fs1Done ? 'bloqueado' : 'en_progreso';
  const xteamStatus  = !fs1Done ? 'bloqueado' : activePremierClients >= 10 ? 'completado' : 'en_progreso';

  const today   = new Date();
  const start   = partner ? parseISO(partner.start_date) : today;
  const deadline = partner ? parseISO(partner.fast_start_deadline) : today;
  const daysIn  = differenceInDays(today, start);
  const daysLeft = Math.max(0, differenceInDays(deadline, today));
  const fsProgress = Math.min(Math.round((daysIn / 120) * 100), 100);

  const handleShare = () => {
    const text = 'Únete a mi equipo en Zynergia. Descarga la app para hacer mejor tracking de tu negocio.';
    if (navigator.share) navigator.share({ text });
    else navigator.clipboard.writeText(text);
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
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[18px] font-bold text-[#0F172A]">{contact?.full_name || 'Partner'}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {hasApp && !isInactive && <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full"><Smartphone className="w-3 h-3" />Activo en app</span>}
                  {isInactive && <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">Inactivo</span>}
                  {!hasApp && <span className="text-[11px] font-semibold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">Sin app</span>}
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F1F5F9]">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Fast Start header card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#004AFE] to-[#0039CC] p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[15px] font-bold">Fast Start</p>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20">
                    {daysLeft > 0 ? `${daysLeft} días restantes` : 'Vencido'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${fsProgress}%` }} />
                </div>

                {/* Stats row */}
                <div className="flex gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-[11px] opacity-70">Día</p>
                    <p className="text-[20px] font-bold">{daysIn}</p>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div className="flex-1 text-center">
                    <p className="text-[11px] opacity-70">Clientes Premier</p>
                    <p className="text-[20px] font-bold">{hasApp ? (isLoading ? '…' : activePremierClients) : '—'}</p>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div className="flex-1 text-center">
                    <p className="text-[11px] opacity-70">Partners</p>
                    <p className="text-[20px] font-bold">{hasApp ? (isLoading ? '…' : partnersCount) : '—'}</p>
                  </div>
                </div>
              </div>

              {hasApp ? (
                isLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-[#004AFE] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[13px] font-semibold text-[#64748B]">Bonos Fast Start</p>
                    <BonusRow label="Q-Team"            subtitle="Meta día 30"  amount={formatBonus('qteam', currency)}     status={qteamStatus}  current={activePremierClients} target={4} />
                    <BonusRow label="Fast Start Nivel 1" subtitle="Meta día 60" amount={formatBonus('fs_nivel1', currency)} status={fs1Status}    current={partnersCount}        target={2} />
                    <BonusRow label="Fast Start Nivel 2" subtitle="Meta día 90" amount={formatBonus('fs_nivel2', currency)} status={fs2Status}    current={0}                    target={1} />
                    <BonusRow label="X-Team"            subtitle="Meta día 120" amount={formatBonus('xteam', currency)}    status={xteamStatus}  current={activePremierClients} target={10} />
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {/* Invitar a descargar */}
                  <div className="bg-[#EEF2FF] rounded-2xl p-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#004AFE] flex items-center justify-center mx-auto mb-2">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[14px] font-bold text-[#0F172A] mb-1">Tu partner aún no tiene la app</p>
                    <p className="text-[12px] text-[#64748B] mb-3">Invítalo a descargar Zynergia para ver su progreso en tiempo real.</p>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 bg-[#004AFE] text-white text-[13px] font-semibold rounded-xl active:scale-95 transition-transform"
                    >
                      <Share2 className="w-4 h-4" />
                      Invitar a Zynergia
                    </button>
                  </div>

                  {/* Vincular por código */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
                    <p className="text-[13px] font-bold text-[#0F172A] mb-1">¿Ya tiene la app?</p>
                    <p className="text-[12px] text-[#64748B] mb-3">Ingresa su código de partner para vincular su cuenta y ver sus métricas.</p>
                    <div className="relative mb-2">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Hash className="w-4 h-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="text"
                        value={codeInput}
                        onChange={e => handleCodeInput(e.target.value)}
                        placeholder="Ej: PEPE23"
                        autoCapitalize="characters"
                        className="w-full pl-9 pr-10 py-3 rounded-xl border border-[#E2E8F0] text-[15px] font-bold text-[#004AFE] tracking-widest placeholder:text-[#CBD5E1] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-[#004AFE] uppercase"
                      />
                      {codeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 text-[#004AFE] animate-spin" />
                        </div>
                      )}
                    </div>
                    {foundUser && (
                      <div className="flex items-center justify-between bg-[#F0FDF4] rounded-xl px-3 py-2 border border-[#86EFAC] mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                          <p className="text-[13px] font-semibold text-[#16A34A]">{foundUser.user_name}</p>
                        </div>
                        <button
                          onClick={() => linkMutation.mutate()}
                          disabled={linkMutation.isPending}
                          className="px-3 py-1.5 bg-[#16A34A] text-white text-[12px] font-semibold rounded-lg active:scale-95 transition-transform disabled:opacity-60"
                        >
                          {linkMutation.isPending ? '...' : 'Vincular'}
                        </button>
                      </div>
                    )}
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
