import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Plus, ChevronDown } from 'lucide-react';
import { format, startOfToday, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import ProductFilterSheet from '@/components/sales/ProductFilterSheet';
import DateFilterSheet from '@/components/sales/DateFilterSheet';
import MainHeader from '@/components/ui/MainHeader';

const dateLabels = {
  today: 'Hoy',
  last7: 'Últimos 7 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  last30: 'Últimos 30 días'
};

export default function Sales() {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [dateRange, setDateRange] = useState('last7');
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);

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
    queryFn: () => db.Sale.list('-purchase_date')
  });

  const getDateRangeFilter = () => {
    const today = startOfToday();
    switch (dateRange) {
      case 'today':
        return { start: today, end: today };
      case 'last7':
        return { start: subDays(today, 6), end: today };
      case 'thisMonth':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last30':
        return { start: subDays(today, 29), end: today };
      default:
        return { start: subDays(today, 6), end: today };
    }
  };

  const filteredSales = useMemo(() => {
    const { start, end } = getDateRangeFilter();
    return sales.filter(sale => {
      const saleDate = new Date(sale.purchase_date);
      const matchesDateRange = saleDate >= start && saleDate <= end;
      const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(sale.product_id);
      return matchesDateRange && matchesProduct;
    });
  }, [sales, selectedProducts, dateRange]);

  const chartData = useMemo(() => {
    const { start, end } = getDateRangeFilter();
    const data = [];
    const current = new Date(start);
    
    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const count = filteredSales.filter(s => s.purchase_date === dateStr).length;
      data.push({
        date: format(current, 'd MMM', { locale: es }),
        ventas: count
      });
      current.setDate(current.getDate() + 1);
    }
    
    return data;
  }, [filteredSales, dateRange]);

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.full_name || 'Contacto';
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Producto';
  };

  return (
    <div className="px-5 pt-8 pb-6">
      <MainHeader title="Ventas" />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setShowProductSheet(true)}
          className={`flex items-center justify-between px-4 h-11 rounded-full text-[14px] font-medium transition-colors ${
            selectedProducts.length > 0
              ? 'bg-[#282B31] text-white'
              : 'bg-[#EEF0F3] text-[#0F172A] hover:bg-[#E5E7EB]'
          }`}
        >
          <span>{selectedProducts.length > 0 ? `${selectedProducts.length} seleccionado${selectedProducts.length > 1 ? 's' : ''}` : 'Todos'}</span>
          <ChevronDown className={`w-4 h-4 ${selectedProducts.length > 0 ? 'text-white' : 'text-[#64748B]'}`} />
        </button>

        <button
          onClick={() => setShowDateSheet(true)}
          className="flex items-center justify-between px-4 h-11 bg-[#EEF0F3] rounded-full text-[14px] font-medium text-[#0F172A] hover:bg-[#E5E7EB] transition-colors"
        >
          <span>{dateLabels[dateRange]}</span>
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
        </button>
      </div>

      {/* Filter Sheets */}
      <ProductFilterSheet
        isOpen={showProductSheet}
        onClose={() => setShowProductSheet(false)}
        products={products}
        selectedProducts={selectedProducts}
        onApply={setSelectedProducts}
      />
      <DateFilterSheet
        isOpen={showDateSheet}
        onClose={() => setShowDateSheet(false)}
        selectedDate={dateRange}
        onSelect={setDateRange}
      />

      {/* Chart */}
      <div className="mb-6 -mx-2">
        <ChartContainer
          config={{
            ventas: {
              label: "Ventas",
              color: "#004AFE",
            },
          }}
          className="h-[180px] w-full"
        >
          <RechartsAreaChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#004AFE" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#004AFE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="ventas"
              type="monotone"
              fill="url(#fillVentas)"
              stroke="#004AFE"
              strokeWidth={2}
            />
          </RechartsAreaChart>
        </ChartContainer>
      </div>

      {/* Recent Sales */}
      <h2 className="text-[16px] font-bold text-[#0F172A] mb-3">Ventas recientes</h2>
      <div className="space-y-2">
        {filteredSales.slice(0, 20).map((sale) => (
          <div
            key={sale.id}
            className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm px-4 py-3 flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#0F172A] text-[14px] truncate">
                {getContactName(sale.contact_id)}
              </h3>
              <p className="text-[12px] text-[#94A3B8] mt-0.5 truncate">
                {getProductName(sale.product_id)}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-[12px] font-medium text-[#64748B]">
                {format(new Date(sale.purchase_date), "d MMM", { locale: es })}
              </p>
              {sale.status === 'cancelled' && (
                <span className="text-[11px] text-[#EF4444] font-semibold">Cancelado</span>
              )}
              {sale.status !== 'cancelled' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{sale.sale_type === 'nueva' ? 'Nueva' : 'Recompra'}</span>
              )}
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#64748B] text-[15px]">No hay ventas en este período</p>
          </div>
        )}
      </div>

      {/* FAB - Sin cambios */}
      <button
        onClick={() => navigate(createPageUrl('NewSale1'))}
        className="bg-[#004AFE] rounded-full fixed bottom-24 right-5 w-14 h-14 flex items-center justify-center shadow-lg transition-colors"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}