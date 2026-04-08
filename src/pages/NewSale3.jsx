import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ArrowRight, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function NewSale3() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contactId, productId } = location.state || {};
  
  const [purchaseDate, setPurchaseDate] = useState(new Date());



  const handleSubmit = () => {
    if (!contactId || !productId || !purchaseDate) return;

    navigate(createPageUrl('NewSale4'), {
      state: {
        contactId,
        productId,
        purchaseDate
      }
    });
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
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Fecha de compra</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-8">
        <p className="text-[15px] text-[#6E6E73] mb-4">
          Selecciona la fecha en que el cliente realizó la compra
        </p>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-14 justify-start text-left font-normal rounded-xl border-[#EAEAEA]",
                !purchaseDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-3 h-5 w-5 text-[#6E6E73]" />
              {purchaseDate ? (
                <span className="text-[15px] text-[#27251f]">
                  {format(purchaseDate, "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              ) : (
                <span className="text-[15px]">Seleccionar fecha</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={purchaseDate}
              onSelect={(date) => setPurchaseDate(date || new Date())}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Fixed Bottom Button */}
      <div className="px-6 py-4">
        <button
          onClick={handleSubmit}
          disabled={!purchaseDate}
          className={`w-full h-12 rounded-2xl flex items-center justify-between px-5 text-[15px] font-semibold transition-colors ${
            !purchaseDate
              ? 'bg-[#F5F5F5] text-[#6E6E73] cursor-not-allowed'
              : 'bg-[#004afe] text-white'
          }`}
        >
          <span>Siguiente</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}