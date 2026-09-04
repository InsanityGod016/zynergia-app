import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const typeLabels = {
  cliente_producto: 'Cliente',
  partner: 'Socio',
  prospecto_producto: 'Prospecto de producto',
  prospecto_partner: 'Prospecto de negocio',
};

function initialsFor(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toLocaleUpperCase('es-419');
}

function CardContent({ name, context, selected = undefined }) {
  return (
    <>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
        <span className="text-[15px] font-bold text-primary">{initialsFor(name)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-left text-[17px] font-semibold leading-6 text-foreground">{name}</h2>
        <p className="truncate text-left text-[15px] leading-5 text-muted-foreground">{context}</p>
      </div>

      {selected !== undefined ? (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
        }`} aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      ) : (
        <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </>
  );
}

export default function ContactCard({ contact, nextPurchaseDays, selected, onSelect }) {
  const name = contact.full_name || 'Contacto eliminado';
  const context = nextPurchaseDays !== null && nextPurchaseDays !== undefined
    ? (nextPurchaseDays === 0 ? 'Compra prevista para hoy' : `Próxima compra en ${nextPurchaseDays} días`)
    : (typeLabels[contact.contact_type] || contact.phone || 'Sin tipo asignado');

  const className = "flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm outline-none transition-[transform,box-shadow] duration-150 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${selected ? 'Quitar' : 'Seleccionar'} ${name}`}
        className={className}
      >
        <CardContent name={name} context={context} selected={selected} />
      </button>
    );
  }

  return (
    <Link
      to={createPageUrl(`ContactDetail?id=${contact.id}`)}
      className={className}
      aria-label={`Abrir contacto ${name}. ${context}`}
    >
      <CardContent name={name} context={context} />
    </Link>
  );
}
