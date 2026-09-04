import { Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function TaskFilterSheet(/** @type {any} */ {
  isOpen,
  onClose,
  title,
  description,
  options,
  selected,
  onSelect,
  sections,
  onClear,
}) {
  const handleSelect = (value) => {
    onSelect(value);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[78dvh] rounded-t-[28px] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6"
      >
        <SheetHeader className="pr-14 text-left">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          <SheetDescription className="text-base">{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-2 overflow-y-auto">
          {sections ? sections.map((section) => (
            <fieldset key={section.key} className="border-t border-border py-4 first:border-t-0">
              <legend className="mb-2 text-[17px] font-bold text-foreground">{section.label}</legend>
              <div className="space-y-1">
                {section.options.map((option) => {
                  const isSelected = section.selected === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => section.onSelect(option.value)}
                      aria-pressed={isSelected}
                      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl px-3 text-left text-[17px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span>{option.label}</span>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'
                      }`}>
                        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )) : options.map((option) => {
            const isSelected = selected === option.value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => handleSelect(option.value)}
                aria-pressed={isSelected}
                className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl px-3 text-left text-base font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{option.label}</span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'
                }`}>
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                </span>
              </button>
            );
          })}
          {sections && (
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <button type="button" onClick={onClear} className="min-h-14 rounded-2xl border border-border bg-card px-4 text-[17px] font-semibold text-foreground">
                Limpiar
              </button>
              <button type="button" onClick={onClose} className="min-h-14 rounded-2xl bg-primary px-4 text-[17px] font-semibold text-primary-foreground">
                Ver tareas
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
