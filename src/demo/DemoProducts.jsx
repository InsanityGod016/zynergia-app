import { useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const demoProducts = [
  { id: 'kit-inicial', name: 'Kit inicial', category: 'Premier Kits', cycle: 180, description: 'Producto de inicio con seguimiento de bienvenida y ciclo de recompra configurado.' },
  { id: 'bienestar-diario', name: 'Bienestar diario', category: 'Compra única', cycle: 30, description: 'Producto de uso frecuente con recordatorios antes y después de la recompra.' },
  { id: 'nutricion', name: 'Nutrición esencial', category: 'Compra única', cycle: 30, description: 'Producto personalizable para mostrar el flujo de ventas y seguimiento.' },
  { id: 'cuidado', name: 'Cuidado personal', category: 'Compra única', cycle: 30, description: 'Producto de ejemplo dentro del catálogo de la cuenta.' },
];

export function DemoProducts() {
  const [category, setCategory] = useState('Premier Kits');
  const [selectedId, setSelectedId] = useState(null);
  const products = useMemo(() => demoProducts.filter(product => product.category === category), [category]);
  const selected = demoProducts.find(product => product.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <Card className="flex items-start gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Package aria-hidden="true" /></span>
        <div>
          <h2 className="text-xl font-bold">Mis productos</h2>
          <p className="mt-1 text-[16px] leading-relaxed text-muted-foreground">Cada venta usa el producto y su ciclo para crear seguimientos y recordatorios de recompra.</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1" role="tablist" aria-label="Tipo de producto">
        {['Premier Kits', 'Compra única'].map(option => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={category === option}
            onClick={() => setCategory(option)}
            className={`min-h-12 rounded-xl px-3 text-[15px] font-bold ${category === option ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="text-[15px] leading-relaxed text-muted-foreground">Catálogo de demostración. La cuenta real conserva sus productos configurados.</p>

      <div className="space-y-3">
        {products.map(product => (
          <button
            key={product.id}
            type="button"
            onClick={() => setSelectedId(product.id)}
            className="flex min-h-[84px] w-full items-center gap-4 rounded-3xl border bg-white p-4 text-left shadow-card"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-lg font-bold text-primary">{product.name.charAt(0)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold">{product.name}</span>
              <span className="mt-1 block text-[15px] text-muted-foreground">Recompra configurada: {product.cycle} días</span>
            </span>
            <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          {selected && <>
            <SheetHeader className="pr-12 text-left">
              <SheetTitle className="text-2xl">{selected.name}</SheetTitle>
              <SheetDescription className="text-[16px]">{selected.category} · producto de demostración</SheetDescription>
            </SheetHeader>
            <Card className="mt-5 p-5">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                <div><p className="text-[17px] font-bold">Ciclo de {selected.cycle} días</p><p className="mt-1 text-[16px] leading-relaxed text-muted-foreground">{selected.description}</p></div>
              </div>
            </Card>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">Al registrar una venta, Zynergia usa este ciclo para programar las tareas correspondientes.</p>
            <SheetClose asChild><Button type="button" size="lg" className="mt-5 w-full">Cerrar producto</Button></SheetClose>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
