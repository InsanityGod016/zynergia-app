import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const typeOptions = [
  { value: 'all', label: 'Todos los contactos' },
  { value: 'cliente_producto', label: 'Clientes' },
  { value: 'partner', label: 'Socios' },
  { value: 'prospecto_producto', label: 'Prospectos de producto' },
  { value: 'prospecto_partner', label: 'Prospectos de negocio' },
];

export default function ContactTypeFilterSheet({ isOpen, onClose, selectedType, onSelect }) {
  const selectType = (value) => {
    onSelect(value);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-xl">Mostrar contactos</SheetTitle>
          <SheetDescription className="text-[15px]">Elige un tipo para reducir la lista.</SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-1" role="radiogroup" aria-label="Tipo de contacto">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selectedType === option.value}
              onClick={() => selectType(option.value)}
              className="flex min-h-14 w-full items-center justify-between rounded-2xl px-3 text-left text-[17px] text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>{option.label}</span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                selectedType === option.value ? 'border-primary bg-primary' : 'border-border bg-card'
              }`} aria-hidden="true">
                {selectedType === option.value && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
