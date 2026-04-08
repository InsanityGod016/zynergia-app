import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Search, Plus, ChevronDown, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ContactCard from '@/components/contacts/ContactCard';
import { Input } from '@/components/ui/input';
import MainHeader from '@/components/ui/MainHeader';
import ContactTypeFilterSheet from '@/components/contacts/ContactTypeFilterSheet';
import BulkChangeTypeSheet from '@/components/contacts/BulkChangeTypeSheet';
import {
  createProspectoProductoTasks,
  createProspectoPartnerTasks,
  cancelFutureTasksByArea,
  createPartnerTasks,
  createReferralTask
} from '@/components/tasks/taskEngine';

export default function Contacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('all');
  const [showTypeSheet, setShowTypeSheet] = useState(false);

  // Bulk selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.Sale.list()
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => db.Partner.list()
  });

  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkChangeType = async (newType) => {
    setBulkLoading(true);
    const allTasks = await db.Task.list();

    await Promise.all(selectedIds.map(async (contactId) => {
      const contact = contacts.find(c => c.id === contactId);
      const prevType = contact?.contact_type || null;

      // Update contact
      const payload = newType ? { contact_type: newType } : {};
      if (!newType) {
        await db.Contact.update(contactId, { contact_type: null });
      } else {
        await db.Contact.update(contactId, payload);
      }

      if (newType === prevType) return;

      // Cancel old prospecto tasks
      if (prevType === 'prospecto_produto' || prevType === 'prospecto_producto') {
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks: allTasks });
      }
      if (prevType === 'prospecto_partner') {
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks: allTasks });
      }

      // No type: cancel prospecto tasks (optional cleanup)
      if (!newType) {
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks: allTasks });
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks: allTasks });
      }

      // Create new sequences
      if (newType === 'prospecto_producto') {
        const fresh = await db.Task.list();
        await createProspectoProductoTasks({ contactId, existingTasks: fresh });
      }
      if (newType === 'prospecto_partner') {
        const fresh = await db.Task.list();
        await createProspectoPartnerTasks({ contactId, existingTasks: fresh });
      }

      // Partner
      if (newType === 'partner') {
        const alreadyPartner = partners.some(p => p.contact_id === contactId);
        if (!alreadyPartner) {
          const todayStr = new Date().toISOString().split('T')[0];
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 120);
          const deadlineStr = deadline.toISOString().split('T')[0];
          await db.Partner.create({
            contact_id: contactId,
            start_date: todayStr,
            fast_start_deadline: deadlineStr,
            fast_start_status: 'activo',
            fase_actual: 1,
            qteam_completed: false,
            fs_level1_completed: false,
            fs_level2_completed: false,
            xteam_completed: false
          });
          await createPartnerTasks({ contactId, startDate: todayStr });
        }
      }

      // Tarea de referido para clientes y partners (30 días desde registro)
      if (newType === 'cliente_producto' || newType === 'partner') {
        const fresh = await db.Task.list();
        await createReferralTask({
          contactId,
          contactCreatedAt: contact?.created_at,
          existingTasks: fresh
        });
      }
    }));

    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['partners'] });
    setBulkLoading(false);
    setShowBulkSheet(false);
    setSelectMode(false);
    setSelectedIds([]);
  };

  const getNextPurchaseDays = (contactId) => {
    const contactSales = sales.filter(s => s.contact_id === contactId && s.status === 'active');
    if (contactSales.length === 0) return null;

    let minDays = Infinity;
    contactSales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product) {
        const lastPurchase = new Date(sale.purchase_date);
        const nextPurchase = new Date(lastPurchase);
        nextPurchase.setDate(nextPurchase.getDate() + product.frequency_days);
        const daysUntil = Math.ceil((nextPurchase - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil < minDays) minDays = daysUntil;
      }
    });

    return minDays === Infinity ? null : Math.max(0, minDays);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = contact.full_name.toLowerCase().includes(search.toLowerCase());
      const matchesType = contactTypeFilter === 'all' || contact.contact_type === contactTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [contacts, search, contactTypeFilter]);

  return (
    <div className="px-5 pt-8 pb-6 bg-white min-h-screen">
      <MainHeader title="Contactos" />

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
        <Input
          placeholder="Buscar por nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-11 bg-white border border-[#E2E8F0] rounded-full text-[15px] placeholder:text-[#94A3B8] focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20"
        />
      </div>

      {/* Filters row */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setShowTypeSheet(true)}
          className={`flex items-center gap-2 px-4 h-9 rounded-full text-[14px] font-medium transition-colors ${
            contactTypeFilter !== 'all'
              ? 'bg-[#282B31] text-white'
              : 'bg-[#EEF0F3] text-[#0F172A]'
          }`}
        >
          Tipo
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={toggleSelectMode}
          className={`text-[14px] font-medium px-4 h-9 rounded-full transition-colors ${
            selectMode ? 'bg-[#282B31] text-white' : 'text-[#004AFE]'
          }`}
        >
          {selectMode ? 'Cancelar' : 'Seleccionar'}
        </button>
      </div>

      {/* Bulk action bar — only shown when items are selected */}
      {selectMode && selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="text-[14px] text-[#64748B] font-medium">
            {selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowBulkSheet(true)}
            className="px-5 h-9 rounded-full bg-[#004AFE] text-white text-[14px] font-medium whitespace-nowrap"
          >
            Cambiar tipo
          </button>
        </div>
      )}

      {/* Contact List */}
      <div className="space-y-2">
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className={`relative flex items-center gap-3 ${selectMode ? 'cursor-pointer' : ''}`}
            onClick={selectMode ? () => toggleSelect(contact.id) : undefined}
          >
            {selectMode && (
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                selectedIds.includes(contact.id)
                  ? 'bg-[#004AFE] border-[#004AFE]'
                  : 'border-[#CBD5E1] bg-white'
              }`}>
                {selectedIds.includes(contact.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            <div className={`flex-1 ${selectMode ? 'pointer-events-none' : ''}`}>
              <ContactCard
                contact={contact}
                products={products}
                sales={sales.filter(s => s.contact_id === contact.id)}
                nextPurchaseDays={getNextPurchaseDays(contact.id)}
              />
            </div>
          </div>
        ))}
        
        {filteredContacts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#64748B] text-[15px]">No hay contactos</p>
          </div>
        )}
      </div>

      {/* Add Button */}
      <Link
        to={createPageUrl('NewContact')}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#004AFE] rounded-full flex items-center justify-center shadow-lg transition-colors"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </Link>

      <ContactTypeFilterSheet
        isOpen={showTypeSheet}
        onClose={() => setShowTypeSheet(false)}
        selectedType={contactTypeFilter}
        onSelect={setContactTypeFilter}
      />

      <BulkChangeTypeSheet
        isOpen={showBulkSheet}
        onClose={() => setShowBulkSheet(false)}
        onConfirm={handleBulkChangeType}
        isLoading={bulkLoading}
      />
    </div>
  );
}