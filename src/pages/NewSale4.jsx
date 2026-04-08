import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { recalculateAllPartners } from '@/components/partners/partnerEngine';
import { createSaleTasks } from '@/components/tasks/taskEngine';

export default function NewSale4() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { contactId, productId, purchaseDate } = location.state || {};
  
  const [selectedType, setSelectedType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => db.Partner.list()
  });

  const createSaleMutation = useMutation({
    mutationFn: (data) => db.Sale.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    }
  });



  const handleSubmit = async () => {
    if (!contactId || !productId || !selectedType || !purchaseDate) return;
    
    setIsSubmitting(true);

    try {
      const saleData = {
        contact_id: contactId,
        product_id: productId,
        purchase_date: format(new Date(purchaseDate), 'yyyy-MM-dd'),
        sale_type: selectedType,
        status: 'active'
      };

      await createSaleMutation.mutateAsync(saleData);

      // Get product info
      const product = products.find(p => p.id === productId);

      // Fetch fresh tasks right before creating new ones (avoid stale cache)
      const freshTasks = await db.Task.list();

      // Use task engine to create sale tasks
      await createSaleTasks({
        contactId,
        productId,
        purchaseDate: format(new Date(purchaseDate), 'yyyy-MM-dd'),
        saleType: selectedType,
        product,
        existingTasks: freshTasks
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Recalculate all partner progress after sale
      const [allSales, allPartners, allProducts] = await Promise.all([
        db.Sale.list(),
        db.Partner.list(),
        db.Product.list()
      ]);
      await recalculateAllPartners(allSales, allPartners, allProducts);
      queryClient.invalidateQueries({ queryKey: ['partners'] });

      navigate(createPageUrl('Sales'));
    } catch (error) {
      console.error('Error creating sale:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center border-b border-[#F0F0F0]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2 relative z-10 active:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5 text-[#27251f]" />
        </button>
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Tipo de venta</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-8">
        <p className="text-[15px] text-[#6E6E73] mb-6">
          Selecciona el tipo de venta
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => setSelectedType('nueva')}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
              selectedType === 'nueva'
                ? 'border-[#004afe] bg-[#F5F8FF]'
                : 'border-[#EAEAEA] bg-white'
            }`}
          >
            <h3 className="text-[17px] font-semibold text-[#27251f] mb-1">
              Nueva venta
            </h3>
            <p className="text-[13px] text-[#6E6E73]">
              Primera compra del cliente
            </p>
          </button>

          <button
            onClick={() => setSelectedType('recompra')}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
              selectedType === 'recompra'
                ? 'border-[#004afe] bg-[#F5F8FF]'
                : 'border-[#EAEAEA] bg-white'
            }`}
          >
            <h3 className="text-[17px] font-semibold text-[#27251f] mb-1">
              Recompra
            </h3>
            <p className="text-[13px] text-[#6E6E73]">
              El cliente ya había comprado antes
            </p>
          </button>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="px-6 py-4">
        <button
          onClick={handleSubmit}
          disabled={!selectedType || isSubmitting}
          className={`w-full h-12 rounded-2xl flex items-center justify-between px-5 text-[15px] font-semibold transition-colors ${
            !selectedType || isSubmitting
              ? 'bg-[#F5F5F5] text-[#6E6E73] cursor-not-allowed'
              : 'bg-[#004afe] text-white'
          }`}
        >
          <span>Guardar venta</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}