import { useEffect, useState } from 'react';
import { ArrowLeft, Tags, Trash2 } from 'lucide-react';
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

export default function BulkChangeTypeSheet({ isOpen, onClose, onConfirm, onDelete, selectedCount, isLoading, error }) {
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('actions');

  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      setMode('actions');
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-xl">{mode === 'actions' ? 'Administrar contactos' : mode === 'type' ? 'Cambiar tipo' : 'Eliminar contactos'}</SheetTitle>
          <SheetDescription className="text-[15px]">
            {selectedCount} contacto{selectedCount === 1 ? '' : 's'} seleccionado{selectedCount === 1 ? '' : 's'}.
          </SheetDescription>
        </SheetHeader>

        {mode === 'actions' && (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => setMode('type')}
              disabled={isLoading}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-muted px-4 text-left text-[17px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              <Tags className="h-5 w-5 text-primary" aria-hidden="true" /> Cambiar tipo
            </button>
            <button
              type="button"
              onClick={() => setMode('delete')}
              disabled={isLoading}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/30 bg-card px-4 text-left text-[17px] font-semibold text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-60"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" /> Eliminar contactos
            </button>
          </div>
        )}

        {mode === 'type' && (
          <>
            <button type="button" onClick={() => setMode('actions')} disabled={isLoading} className="mt-4 flex min-h-12 items-center gap-2 rounded-xl pr-3 text-[16px] font-semibold text-primary"><ArrowLeft className="h-5 w-5" /> Volver</button>
            <div className="mt-2 space-y-1" role="radiogroup" aria-label="Nuevo tipo de contacto">
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
          </>
        )}

        {mode === 'delete' && (
          <div className="mt-5">
            <div className="rounded-2xl bg-destructive/10 p-4">
              <p className="text-[17px] font-semibold text-destructive">Esta acción no se puede deshacer</p>
              <p className="mt-2 text-[15px] leading-6 text-destructive">Las ventas se conservarán sin datos personales. Si uno es un socio vinculado, no se eliminará ninguno.</p>
            </div>
            <button type="button" onClick={() => setMode('actions')} disabled={isLoading} className="mt-2 min-h-12 w-full rounded-2xl text-[16px] font-semibold text-muted-foreground">Cancelar</button>
          </div>
        )}

        {error && <p className="mt-3 text-[15px] font-medium text-destructive" role="alert">{error}</p>}
        {mode === 'type' && (
          <button type="button" onClick={() => onConfirm(selected)} disabled={selected === null || isLoading} className="mt-5 min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50">
            {isLoading ? 'Guardando…' : 'Confirmar cambio'}
          </button>
        )}
        {mode === 'delete' && (
          <button type="button" onClick={onDelete} disabled={isLoading} className="mt-3 min-h-14 w-full rounded-2xl bg-destructive px-5 text-[17px] font-semibold text-destructive-foreground outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:opacity-50">
            {isLoading ? 'Eliminando…' : `Eliminar ${selectedCount} contacto${selectedCount === 1 ? '' : 's'}`}
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
