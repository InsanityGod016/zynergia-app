import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TagAutocomplete from '@/components/contacts/TagAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createProspectoProductoTasks,
  createProspectoPartnerTasks,
  cancelFutureTasksByArea,
  createReferralTask
} from '@/components/tasks/taskEngine';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ContactDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const contactId = params.get('id');
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    notes: '',
    tag_ids: [],
    contact_type: ''
  });

  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => db.Contact.filter({ id: contactId }),
    select: (data) => data[0]
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => db.Tag.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', contactId],
    queryFn: () => db.Sale.filter({ contact_id: contactId })
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        full_name: contact.full_name || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        tag_ids: contact.tag_ids || [],
        contact_type: contact.contact_type || ''
      });
    }
  }, [contact]);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => db.Partner.list()
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const prevType = contact?.contact_type;
      await db.Contact.update(contactId, data);

      const newType = data.contact_type || null;
      // Handle contact_type change side effects
      if (newType !== prevType) {
        // Cancel old prospecto tasks if type changes away
        if (prevType === 'prospecto_producto') {
          await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks: allTasks });
        }
        if (prevType === 'prospecto_partner') {
          await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks: allTasks });
        }

        // Create new sequences if moving to a prospecto type
        if (newType === 'prospecto_producto') {
          const fresh = await db.Task.list();
          await createProspectoProductoTasks({ contactId, existingTasks: fresh });
        }
        if (newType === 'prospecto_partner') {
          const fresh = await db.Task.list();
          await createProspectoPartnerTasks({ contactId, existingTasks: fresh });
        }

        // If changing to partner, auto-create Partner record if not exists
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
            const { createPartnerTasks } = await import('@/components/tasks/taskEngine');
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (saleId) => db.Sale.update(saleId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', contactId] });
      setCancelSaleId(null);
    }
  });

  const handleSave = () => {
    const payload = { ...formData };
    if (!payload.contact_type) delete payload.contact_type;
    updateMutation.mutate(payload);
  };

  const activeSales = sales.filter(s => s.status === 'active');
  const allSales = sales.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

  const getProductDetails = (productId) => {
    const product = products.find(p => p.id === productId);
    const productSales = sales.filter(s => s.product_id === productId && s.status === 'active');
    const purchaseCount = productSales.length;
    const lastSale = productSales.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))[0];
    
    let nextPurchaseDays = null;
    if (lastSale && product) {
      const lastPurchase = new Date(lastSale.purchase_date);
      const nextPurchase = new Date(lastPurchase);
      nextPurchase.setDate(nextPurchase.getDate() + product.frequency_days);
      nextPurchaseDays = Math.max(0, Math.ceil((nextPurchase - new Date()) / (1000 * 60 * 60 * 24)));
    }

    return {
      product,
      purchaseCount,
      lastPurchaseDate: lastSale?.purchase_date,
      nextPurchaseDays,
      latestSaleId: lastSale?.id
    };
  };

  const uniqueActiveProductIds = [...new Set(activeSales.map(s => s.product_id))];

  const handleWhatsApp = () => {
    if (contact?.phone) {
      window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[#004afe] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center">
        <button
          onClick={() => navigate(createPageUrl('Contacts'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Name - Editable */}
        <div>
          <input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="text-2xl font-bold text-[#27251f] w-full border-0 focus:outline-none"
          />
        </div>

        {/* Phone & WhatsApp */}
        <div className="flex items-center justify-between pb-5 border-b border-[#EAEAEA]">
          <input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="text-[15px] text-[#6E6E73] border-0 focus:outline-none"
          />
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/20 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>

        {/* Contact Type - Editable */}
        <div>
          <h2 className="text-sm font-semibold text-[#27251f] mb-2">Tipo de contacto</h2>
          <Select
            value={formData.contact_type || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, contact_type: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Sin tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin tipo</SelectItem>
              <SelectItem value="prospecto_producto">Prospecto producto</SelectItem>
              <SelectItem value="prospecto_partner">Prospecto partner</SelectItem>
              <SelectItem value="cliente_producto">Cliente producto</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags - Editable */}
        <div>
          <h2 className="text-sm font-semibold text-[#27251f] mb-3">Etiquetas</h2>
          <TagAutocomplete
            selectedTagIds={formData.tag_ids}
            onChange={(tagIds) => setFormData({ ...formData, tag_ids: tagIds })}
          />
        </div>

        {/* Products Section */}
        <div>
          <h2 className="text-lg font-semibold text-[#27251f] mb-4">Productos</h2>
          <div className="space-y-3">
            {uniqueActiveProductIds.map(productId => {
              const details = getProductDetails(productId);
              if (!details.product) return null;

              return (
                <div
                  key={productId}
                  className="bg-white rounded-2xl p-4 border border-[#EAEAEA]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-[#27251f] text-[15px]">
                      {details.product.name}
                    </h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      Activo
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[13px] text-[#6E6E73]">
                    {details.lastPurchaseDate && (
                      <p>
                        Última compra: {format(new Date(details.lastPurchaseDate), "d 'de' MMMM", { locale: es })}
                      </p>
                    )}
                    <p>Compras realizadas: {details.purchaseCount}</p>
                    <p>Frecuencia: cada {details.product.frequency_days} días</p>
                    {details.nextPurchaseDays !== null && (
                      <p>Próxima compra: en {details.nextPurchaseDays} días</p>
                    )}
                  </div>
                  <button
                    onClick={() => setCancelSaleId(details.latestSaleId)}
                    className="mt-3 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    Cancelar suscripción
                  </button>
                </div>
              );
            })}

            {uniqueActiveProductIds.length === 0 && (
              <p className="text-[#6E6E73] text-sm text-center py-6">
                No hay productos activos
              </p>
            )}
          </div>
        </div>

        {/* Purchase History */}
        <div>
          <h2 className="text-lg font-semibold text-[#27251f] mb-4">Historial de compras</h2>
          <div className="space-y-2">
            {allSales.map(sale => {
              const product = products.find(p => p.id === sale.product_id);
              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-3 border-b border-[#EAEAEA]"
                >
                  <div>
                    <p className="font-medium text-[#27251f] text-[15px]">
                      {product?.name || 'Producto'}
                    </p>
                    <p className="text-[13px] text-[#6E6E73]">
                      {format(new Date(sale.purchase_date), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  {sale.status === 'cancelled' && (
                    <span className="text-xs text-red-500">Cancelado</span>
                  )}
                </div>
              );
            })}

            {allSales.length === 0 && (
              <p className="text-[#6E6E73] text-sm text-center py-6">
                No hay compras registradas
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#EAEAEA]">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full h-12 bg-[#004afe] hover:bg-[#0039cc] text-white rounded-xl text-[15px] font-semibold disabled:opacity-50"
        >
          Guardar cambios
        </button>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelSaleId} onOpenChange={() => setCancelSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la suscripción como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate(cancelSaleId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}