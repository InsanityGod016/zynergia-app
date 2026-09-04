import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const contactTypes = [
  { value: '', label: 'Sin tipo' },
  { value: 'prospecto_producto', label: 'Prospecto de producto' },
  { value: 'prospecto_partner', label: 'Prospecto de negocio' },
  { value: 'cliente_producto', label: 'Cliente' },
  { value: 'partner', label: 'Socio' },
];

export default function BulkChangeTypeSheet({ isOpen, onClose, onConfirm, isLoading, error }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!isOpen) setSelected(null);
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-xl">Cambiar tipo</SheetTitle>
          <SheetDescription className="text-[15px]">El cambio se aplicará a todos los contactos seleccionados.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-1" role="radiogroup" aria-label="Nuevo tipo de contacto">
          {contactTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={selected === type.value}
              onClick={() => setSelected(type.value)}
              disabled={isLoading}
              className="flex min-h-14 w-full items-center justify-between rounded-2xl px-3 text-left text-[17px] text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {type.label}
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                selected === type.value ? 'border-primary bg-primary' : 'border-border bg-card'
              }`} aria-hidden="true">
                {selected === type.value && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-[15px] font-medium text-destructive" role="alert">{error}</p>}
        <button
          type="button"
          onClick={() => onConfirm(selected)}
          disabled={selected === null || isLoading}
          className="mt-5 min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Guardando…' : 'Confirmar cambio'}
        </button>
      </SheetContent>
    </Sheet>
  );
}
