import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Users, Zap, Network } from 'lucide-react';
import { toast } from 'sonner';
import MainHeader from '@/components/ui/MainHeader';
import PartnerCard from '@/components/partners/PartnerCard';
import AddPartnerSheet from '@/components/partners/AddPartnerSheet';
import PartnerDetailSheet from '@/components/partners/PartnerDetailSheet';
import { recalculateAllPartners } from '@/components/partners/partnerEngine';
import { createPartnerTasks, refreshSmartPartnerTasks } from '@/components/tasks/taskEngine';
import FastStartDashboard from '@/components/partners/FastStartDashboard';
import { DEFAULT_PRODUCTS } from '@/lib/defaultProducts';
import { runNotificationEngine } from '@/components/notifications/notificationEngine';
import { schedulePartnerReminders } from '@/lib/notifications';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function productId(name) {
  return 'prod_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const PREMIER_PRODUCT_IDS = DEFAULT_PRODUCTS
  .filter(p => p.category === 'Premier Kits')
  .map(p => productId(p.name));

export default function Partners() {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeTab, setActiveTab] = useState('faststart');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const queryClient = useQueryClient();

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => db.Partner.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list()
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.Sale.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.Settings.list()
  });

  const currency = settingsList[0]?.default_currency || 'MXN';

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  // Auto-recalculate whenever partners or sales change
  useEffect(() => {
    if (partners.length > 0 && products.length > 0) {
      recalculateAllPartners(sales, partners, products).then(() => {
        queryClient.invalidateQueries({ queryKey: ['partners'] });
      });
    }
  }, [sales.length, partners.length]);

  // Run notification engine on load / when data changes
  useEffect(() => {
    if (products.length === 0) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;
      runNotificationEngine({ userId: uid, tasks, sales, products, partners });
    }).catch(() => {});
  }, [tasks.length, sales.length, partners.length, products.length]);

  // Schedule native push reminders for Fast Start deadlines
  useEffect(() => {
    if (partners.length > 0) {
      schedulePartnerReminders(partners);
    }
  }, [partners]);

  const createPartnerMutation = useMutation({
    mutationFn: async ({ contactId, partnerUserId }) => {
      const todayStr = today();
      const deadline = addDays(todayStr, 120);
      await db.Partner.create({
        contact_id: contactId,
        partner_user_id: partnerUserId || null,
        start_date: todayStr,
        fast_start_deadline: deadline,
        fast_start_status: 'activo',
        fase_actual: 1,
        qteam_completed: false,
        fs_level1_completed: false,
        fs_level2_completed: false,
        xteam_completed: false
      });
      await db.Contact.update(contactId, { contact_type: 'partner' });
      await createPartnerTasks({ contactId, startDate: todayStr });
      const [allSales, allPartners, allProducts] = await Promise.all([
        db.Sale.list(), db.Partner.list(), db.Product.list()
      ]);
      await recalculateAllPartners(allSales, allPartners, allProducts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowAddSheet(false);
    }
  });

  const handleConfirmByCode = async ({ user_id, user_name }) => {
    const newContact = await db.Contact.create({
      full_name: user_name,
      contact_type: 'partner',
      phone: '',
      country_code: '+52',
      notes: 'Agregado por código de partner',
    });
    // Set parent_id in partner's settings so hierarchy is bidirectional
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      supabase.rpc('set_parent_id', { p_child_user_id: user_id, p_parent_user_id: session.user.id }).catch(() => {});
    }
    createPartnerMutation.mutate({ contactId: newContact.id, partnerUserId: user_id });
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

  // Fetch real Fast Start metrics for partners with app
  const { data: partnerFsMetrics = [] } = useQuery({
    queryKey: ['partners_fs_metrics', partnerUserIds],
    queryFn: async () => {
      if (partnerUserIds.length === 0) return [];
      const { data } = await supabase.rpc('get_partners_fs_metrics', {
        user_ids: partnerUserIds,
        premier_product_ids: PREMIER_PRODUCT_IDS,
      });
      return data || [];
    },
    enabled: partnerUserIds.length > 0,
  });

  // Refresh smart tasks for partners with app whenever metrics change
  useEffect(() => {
    if (partnerFsMetrics.length === 0 || tasks.length === 0) return;
    const partnersWithApp = partners.filter(p => p.partner_user_id);
    if (partnersWithApp.length === 0) return;

    partnersWithApp.forEach(partner => {
      const metrics = partnerFsMetrics.find(m => m.user_id === partner.partner_user_id);
      if (!metrics) return;
      const contact = contacts.find(c => c.id === partner.contact_id);
      refreshSmartPartnerTasks({
        contactId: partner.contact_id,
        contactName: contact?.full_name || 'Partner',
        activePremierClients: metrics.premier_clients || 0,
        partnersCount: metrics.partners_count || 0,
        existingTasks: tasks,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }).catch(() => {});
    });
  }, [partnerFsMetrics.length]);

  const getPartnerStatus = (partner) => {
    if (!partner.partner_user_id) return null;
    const activity = partnerActivity.find(a => a.user_id === partner.partner_user_id);
    if (!activity?.last_active) return 'activo';
    const daysSince = (Date.now() - new Date(activity.last_active).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14 ? 'inactivo' : 'activo';
  };

  const importClientsMutation = useMutation({
    mutationFn: async (partnerUserId) => {
      const { data, error } = await supabase.rpc('import_partner_clients', { p_partner_user_id: partnerUserId });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`${count} cliente${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''}`);
    },
    onError: () => toast.error('Error al importar clientes'),
  });

  return (
    <div className="px-5 pt-8 pb-6">
      <MainHeader title="Partners" />

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('faststart')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
            activeTab === 'faststart' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
        >
          <Zap className="w-4 h-4" />
          Fast Start
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
            activeTab === 'partners' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
        >
          <Network className="w-4 h-4" />
          Partners
          {partners.length > 0 && (
            <span className={`text-[12px] px-1.5 py-0.5 rounded-full ${activeTab === 'partners' ? 'bg-white/20' : 'bg-[#E2E8F0]'}`}>
              {partners.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'faststart' ? (
        <FastStartDashboard
          partners={partners}
          sales={sales}
          products={products}
          currency={currency}
        />
      ) : (
        <>
          {partners.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
              <p className="text-[#64748B] text-[15px]">No hay partners aún</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">Toca + para agregar tu primer partner</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map(partner => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  contact={getContact(partner.contact_id)}
                  activityStatus={getPartnerStatus(partner)}
                  onImportClients={partner.partner_user_id ? () => importClientsMutation.mutate(partner.partner_user_id) : null}
                  isImporting={importClientsMutation.isPending}
                  onClick={() => setSelectedPartner(partner)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#004AFE] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-40"
      >
        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>

      <PartnerDetailSheet
        isOpen={!!selectedPartner}
        onClose={() => setSelectedPartner(null)}
        partner={selectedPartner}
        contact={selectedPartner ? getContact(selectedPartner.contact_id) : null}
        activityStatus={selectedPartner ? getPartnerStatus(selectedPartner) : null}
        currency={currency}
      />

      <AddPartnerSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        contacts={contacts}
        existingPartnerContactIds={partners.map(p => p.contact_id)}
        onConfirm={(contactId) => createPartnerMutation.mutate({ contactId })}
        onConfirmByCode={handleConfirmByCode}
        isPending={createPartnerMutation.isPending}
      />
    </div>
  );
}