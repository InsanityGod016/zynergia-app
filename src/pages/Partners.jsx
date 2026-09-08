import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/api/db';
import { supabase } from '@/lib/supabaseClient';
import { CalendarDays, Loader2, Network, Plus, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import MainHeader from '@/components/ui/MainHeader';
import PartnerCard from '@/components/partners/PartnerCard';
import AddPartnerSheet from '@/components/partners/AddPartnerSheet';
import PartnerDetailSheet from '@/components/partners/PartnerDetailSheet';
import { createPartnerTasks, refreshSmartPartnerTasks } from '@/components/tasks/taskEngine';
import FastStartDashboard from '@/components/partners/FastStartDashboard';
import { useAuth } from '@/lib/AuthContext';
import { partnerForPushRoute } from '@/lib/pushNotifications';
import { createPageUrl } from '@/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function FastStartDateSheet({ open, currentDate, isPending, error, onClose, onSave }) {
  const [value, setValue] = useState(currentDate?.slice(0, 10) || today());
  const isCorrection = Boolean(currentDate);
  const unchanged = isCorrection && value === currentDate.slice(0, 10);

  useEffect(() => {
    if (open) setValue(currentDate?.slice(0, 10) || today());
  }, [currentDate, open]);

  return (
    <Sheet open={open} onOpenChange={nextOpen => !nextOpen && !isPending && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-xl">{isCorrection ? 'Corrige tu fecha de inicio' : '¿Cuándo comenzaste tu negocio?'}</SheetTitle>
          <SheetDescription className="text-[17px] leading-relaxed">
            {isCorrection
              ? 'Confirma la fecha correcta. Zynergia volverá a calcular tus días y metas Fast Start.'
              : 'Usaremos esta fecha para mostrar tus días y metas Fast Start. Puedes cambiarla después.'}
          </SheetDescription>
        </SheetHeader>

        <form className="mt-6" onSubmit={event => { event.preventDefault(); onSave(value); }}>
          <label htmlFor="fast-start-date" className="mb-2 block text-[15px] font-semibold text-foreground">Fecha de inicio</label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="fast-start-date"
              type="date"
              required
              max={today()}
              value={value}
              onChange={event => setValue(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-border bg-white pl-12 pr-4 text-[17px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-[15px] text-red-800" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !value || unchanged}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[17px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {isPending ? 'Guardando…' : isCorrection ? 'Sí, cambiar fecha' : 'Guardar fecha'}
          </button>
          <SheetClose asChild>
            <button type="button" disabled={isPending} className="mt-2 min-h-12 w-full rounded-xl text-[16px] font-semibold text-muted-foreground disabled:opacity-50">
              {isCorrection ? 'Conservar fecha actual' : 'Ahora no'}
            </button>
          </SheetClose>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Partners() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPartnerId = searchParams.get('partnerId');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFastStartDateSheet, setShowFastStartDateSheet] = useState(false);
  const [fastStartDatePrompted, setFastStartDatePrompted] = useState(false);
  const [fastStartDateError, setFastStartDateError] = useState('');
  const [activeTab, setActiveTab] = useState('faststart');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const queryClient = useQueryClient();

  const { data: partners = [], isFetched: partnersFetched } = useQuery({
    queryKey: ['partners'],
    queryFn: () => db.Partner.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list()
  });

  const { data: settingsList = [], isFetched: settingsFetched } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.Settings.list()
  });

  const settings = settingsList[0] || {};
  const currency = settings.default_currency || 'MXN';
  const fastStartStartedAt = settings.fast_start_started_at || null;

  useEffect(() => {
    if (!requestedPartnerId || !partnersFetched) return;
    const partner = partnerForPushRoute(partners, requestedPartnerId);
    if (!partner) {
      navigate(createPageUrl('Tasks'), { replace: true });
      return;
    }
    setActiveTab('partners');
    setSelectedPartner(partner);
    navigate(createPageUrl('Partners'), { replace: true });
  }, [navigate, partners, partnersFetched, requestedPartnerId]);

  useEffect(() => {
    if (!settingsFetched || !settings.id || fastStartStartedAt || fastStartDatePrompted) return;
    setFastStartDatePrompted(true);
    setShowFastStartDateSheet(true);
  }, [fastStartDatePrompted, fastStartStartedAt, settings.id, settingsFetched]);

  const setFastStartDateMutation = useMutation({
    mutationFn: async (date) => {
      const { data, error } = await supabase.rpc('set_fast_start_date', { p_started_at: date });
      if (error) throw error;
      return data;
    },
    onMutate: () => setFastStartDateError(''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      setShowFastStartDateSheet(false);
      toast.success('Fecha Fast Start guardada');
    },
    onError: () => setFastStartDateError('No pudimos guardar. Tu fecha sigue igual. Intenta de nuevo.'),
  });

  const openFastStartDateSheet = () => {
    setFastStartDateError('');
    setShowFastStartDateSheet(true);
  };

  const { data: tasks = [], isFetched: tasksFetched } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (/** @type {{contactId: string, startDate?: string | null}} */ { contactId, startDate }) => {
      const effectiveStartDate = startDate || today();
      const deadline = addDays(effectiveStartDate, 120);
      await db.Partner.create({
        contact_id: contactId,
        start_date: effectiveStartDate,
        fast_start_deadline: deadline,
        fast_start_status: 'activo',
        fase_actual: 1,
        qteam_completed: false,
        fs_level1_completed: false,
        fs_level2_completed: false,
        xteam_completed: false
      });
      await db.Contact.update(contactId, { contact_type: 'partner' });
      await createPartnerTasks({ contactId, startDate: effectiveStartDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowAddSheet(false);
    },
    onError: () => toast.error('No pudimos agregar el partner. Intenta de nuevo.'),
  });

  const handleConfirmByCode = async ({ partner_code }) => {
    const { error } = await supabase.rpc('link_partner_by_code', { p_code: partner_code });
    if (error) throw error;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['partners'] }),
      queryClient.invalidateQueries({ queryKey: ['contacts'] }),
    ]);
    setShowAddSheet(false);
  };

  const getContact = (contactId) => contacts.find(c => c.id === contactId);

  // Fetch activity for partners that have the app
  const partnerUserIds = partners.filter(p => p.partner_user_id).map(p => p.partner_user_id);
  const { data: partnerActivity = [] } = useQuery({
    queryKey: ['partners_activity', partnerUserIds],
    queryFn: async () => {
      if (partnerUserIds.length === 0) return [];
      const { data } = await supabase.rpc('get_partners_activity', { user_ids: partnerUserIds });
      return data || [];
    },
    enabled: partnerUserIds.length > 0,
  });

  // One authoritative, privacy-safe snapshot for the owner and linked partners.
  const {
    data: fastStartSnapshots = [],
    isLoading: partnerMetricsLoading,
    isError: partnerMetricsError,
    refetch: refetchFastStartSnapshots,
  } = useQuery({
    queryKey: ['fast_start_snapshots_v2', user?.id, partnerUserIds],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_snapshot_v2');
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  const metricsForPartner = (partner) => partner?.partner_user_id
    ? fastStartSnapshots.find(metric => metric.user_id === partner.partner_user_id) || null
    : null;
  const ownFastStartSnapshot = fastStartSnapshots.find(metric => metric.user_id === user?.id) || null;
  const directBranchMetrics = partners.map(partner => {
    const metric = metricsForPartner(partner);
    return {
      partnerId: partner.id,
      qteamKits: Number.isFinite(metric?.qteam_kits) ? metric.qteam_kits : null,
    };
  });

  const partnerFsMetricsKey = fastStartSnapshots
    .map(metric => `${metric.user_id}:${metric.qteam_kits || 0}:${metric.xteam_kits || 0}:${metric.partners_count || 0}:${metric.fast_start_started_at || ''}:${(metric.direct_branches || []).map(branch => branch?.qteam_kits ?? '?').join(',')}`)
    .sort()
    .join('|');

  // Refresh smart tasks for partners with app whenever metrics change
  useEffect(() => {
    if (!tasksFetched || fastStartSnapshots.length === 0) return;
    const partnersWithApp = partners.filter(p => p.partner_user_id);
    if (partnersWithApp.length === 0) return;

    partnersWithApp.forEach(partner => {
      const metrics = fastStartSnapshots.find(m => m.user_id === partner.partner_user_id);
      if (!metrics) return;
      const contact = contacts.find(c => c.id === partner.contact_id);
      refreshSmartPartnerTasks({
        contactId: partner.contact_id,
        contactName: contact?.full_name || 'Partner',
        activePremierKits: metrics.qteam_kits || 0,
        xteamKits: metrics.xteam_kits || 0,
        partnersCount: metrics.partners_count || 0,
        directBranches: Array.isArray(metrics.direct_branches) ? metrics.direct_branches : [],
        existingTasks: tasks,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }).catch(() => {});
    });
  }, [partnerFsMetricsKey, tasksFetched]);

  const getPartnerStatus = (partner) => {
    if (!partner.partner_user_id) return null;
    const activity = partnerActivity.find(a => a.user_id === partner.partner_user_id);
    if (!activity?.last_active) return 'activo';
    const daysSince = (Date.now() - new Date(activity.last_active).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14 ? 'inactivo' : 'activo';
  };

  return (
    <div className="px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <MainHeader title="Equipo" />

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('faststart')}
          className={`flex-1 min-h-12 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-semibold transition-colors ${
            activeTab === 'faststart' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
          aria-pressed={activeTab === 'faststart'}
        >
          <Zap className="w-4 h-4" />
          Fast Start
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 min-h-12 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-semibold transition-colors ${
            activeTab === 'partners' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
          aria-pressed={activeTab === 'partners'}
        >
          <Network className="w-4 h-4" />
          Mi equipo
          {partners.length > 0 && (
            <span className={`text-[15px] px-1.5 py-0.5 rounded-full ${activeTab === 'partners' ? 'bg-white/20' : 'bg-[#E2E8F0]'}`}>
              {partners.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'faststart' ? (
        <FastStartDashboard
          partners={partners}
          snapshot={ownFastStartSnapshot}
          currency={currency}
          startDate={fastStartStartedAt}
          directBranchMetrics={directBranchMetrics}
          metricsLoading={partnerMetricsLoading}
          metricsError={partnerMetricsError}
          onEditStartDate={openFastStartDateSheet}
          onRetryMetrics={refetchFastStartSnapshots}
        />
      ) : (
        <>
          {partners.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
              <p className="text-[#64748B] text-[15px]">No hay partners aún</p>
              <p className="text-[15px] text-[#64748B] mt-1">Toca “Agregar partner” para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map(partner => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  contact={getContact(partner.contact_id)}
                  activityStatus={getPartnerStatus(partner)}
                  fastStartMetrics={metricsForPartner(partner)}
                  metricsLoading={partnerMetricsLoading}
                  metricsError={partnerMetricsError}
                  onClick={() => setSelectedPartner(partner)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Acción principal siempre visible y con texto. */}
      <button
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#004AFE] px-5 text-[16px] font-semibold text-white shadow-lg transition-transform active:scale-95"
        aria-label="Agregar partner"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
        Agregar partner
      </button>

      <PartnerDetailSheet
        isOpen={!!selectedPartner}
        onClose={() => setSelectedPartner(null)}
        partner={selectedPartner}
        contact={selectedPartner ? getContact(selectedPartner.contact_id) : null}
        activityStatus={selectedPartner ? getPartnerStatus(selectedPartner) : null}
        fastStartMetrics={selectedPartner ? metricsForPartner(selectedPartner) : null}
        metricsLoading={partnerMetricsLoading}
        metricsError={partnerMetricsError}
        currency={currency}
      />

      <AddPartnerSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        contacts={contacts}
        existingPartnerContactIds={partners.map(p => p.contact_id)}
        onConfirm={(contactId, startDate) => createPartnerMutation.mutateAsync({ contactId, startDate })}
        onConfirmByCode={handleConfirmByCode}
        isPending={createPartnerMutation.isPending}
      />

      <FastStartDateSheet
        open={showFastStartDateSheet}
        currentDate={fastStartStartedAt}
        isPending={setFastStartDateMutation.isPending}
        error={fastStartDateError}
        onClose={() => setShowFastStartDateSheet(false)}
        onSave={date => setFastStartDateMutation.mutate(date)}
      />
    </div>
  );
}
