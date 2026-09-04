import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/** @typedef {{ id: string | number, name: string, phone: string }} DemoContact */
/** @typedef {{ id: string, name: string }} DemoProduct */
/** @typedef {{ id: string, contact: string, product: string, saleType: 'nueva' | 'recompra', date: string }} DemoSale */
/** @typedef {{ contactId: string | number, productId: string, saleType: '' | 'nueva' | 'recompra', date: string }} SaleDraft */

/** @type {DemoContact[]} */
const fallbackContacts = [
  { id: 'maria', name: 'María López', phone: '+52 55 1234 5678' },
  { id: 'jose', name: 'José Ramírez', phone: '+52 81 5555 0192' },
  { id: 'ana', name: 'Ana García', phone: '+57 300 555 0144' },
  { id: 'carlos', name: 'Carlos Ruiz', phone: '+52 33 5555 0148' },
];

/** @type {DemoProduct[]} */
const products = [
  { id: 'bienestar', name: 'Kit de bienestar' },
  { id: 'inicio', name: 'Kit inicial' },
  { id: 'nutricion', name: 'Producto nutricional' },
  { id: 'cuidado', name: 'Producto de cuidado' },
];

const saleTypeOptions = /** @type {const} */ ([
  ['nueva', 'Nueva venta', 'Primera compra de este cliente'],
  ['recompra', 'Recompra', 'El cliente ya había comprado'],
]);

const pad = (/** @type {number} */ value) => String(value).padStart(2, '0');

const toInputDate = (/** @type {Date} */ date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const daysAgo = (/** @type {number} */ days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toInputDate(date);
};

const today = () => toInputDate(new Date());

/** @type {DemoSale[]} */
const initialSales = [
  { id: 'sale-1', contact: 'María López', product: 'Kit de bienestar', saleType: 'recompra', date: daysAgo(0) },
  { id: 'sale-2', contact: 'José Ramírez', product: 'Kit inicial', saleType: 'nueva', date: daysAgo(3) },
  { id: 'sale-3', contact: 'Carlos Ruiz', product: 'Producto nutricional', saleType: 'nueva', date: daysAgo(12) },
];

/** @returns {SaleDraft} */
const blankDraft = () => ({ contactId: '', productId: '', saleType: '', date: today() });

const longDate = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const normalize = (/** @type {string} */ value) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** @param {{ step: number }} props */
function StepProgress({ step }) {
  return (
    <div aria-label={`Paso ${step} de 4`}>
      <p className="text-[15px] font-bold text-primary">Paso {step} de 4</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${step * 25}%` }} />
      </div>
    </div>
  );
}

/** @param {{ label: string, value: string }} props */
function SummaryRow({ label, value }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 px-5 py-3">
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[16px] font-bold">{value}</dd>
    </div>
  );
}

/**
 * Demo local de ventas. Puede abrir el flujo al montarse para enlazarlo desde Hoy.
 * @param {{ initiallyOpen?: boolean, contacts?: DemoContact[] }} props
 */
export function DemoSales({ initiallyOpen = false, contacts: providedContacts }) {
  const availableContacts = providedContacts ?? fallbackContacts;
  const [sales, setSales] = useState(initialSales);
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(blankDraft);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [error, setError] = useState('');
  const [result, setResult] = useState(/** @type {DemoSale | null} */ (null));
  const submitLock = useRef(false);
  const nextId = useRef(initialSales.length + 1);

  useEffect(() => {
    if (initiallyOpen) setIsOpen(true);
  }, [initiallyOpen]);

  const selectedContact = availableContacts.find(contact => contact.id === draft.contactId);
  const selectedProduct = products.find(product => product.id === draft.productId);

  const visibleContacts = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return availableContacts;
    return availableContacts.filter(contact => normalize(`${contact.name} ${contact.phone}`).includes(query));
  }, [availableContacts, search]);

  const filteredSales = useMemo(() => sales.filter(sale => {
    if (productFilter !== 'all' && sale.product !== products.find(product => product.id === productFilter)?.name) return false;
    const saleDate = new Date(`${sale.date}T12:00:00`);
    const current = new Date();
    if (dateFilter === 'today') return sale.date === today();
    if (dateFilter === 'month') return saleDate.getMonth() === current.getMonth() && saleDate.getFullYear() === current.getFullYear();
    return true;
  }), [dateFilter, productFilter, sales]);

  const resetFlow = () => {
    setStep(1);
    setDraft(blankDraft());
    setSearch('');
    setError('');
    setResult(null);
    submitLock.current = false;
  };

  const openFlow = () => {
    setIsOpen(true);
  };

  const cancelFlow = () => {
    resetFlow();
    setIsOpen(false);
  };

  const finishFlow = () => {
    resetFlow();
    setIsOpen(false);
  };

  const goBack = () => {
    setError('');
    if (step === 1) setIsOpen(false);
    else setStep(current => current - 1);
  };

  const goNext = () => {
    setError('');
    if (step === 1 && !selectedContact) return setError('Elige a la persona que hizo la compra.');
    if (step === 2 && !selectedProduct) return setError('Elige el producto vendido.');
    if (step === 3 && !draft.date) return setError('Elige la fecha de la venta.');
    setStep(current => Math.min(current + 1, 4));
  };

  const registerSale = () => {
    if (submitLock.current || !selectedContact || !selectedProduct || !draft.saleType || !draft.date) return;
    submitLock.current = true;

    const sale = {
      id: `sale-${nextId.current++}`,
      contact: selectedContact.name,
      product: selectedProduct.name,
      saleType: draft.saleType,
      date: draft.date,
    };
    setSales(current => [sale, ...current]);
    setResult(sale);
  };

  const canContinue = step === 1
    ? Boolean(selectedContact)
    : step === 2
      ? Boolean(selectedProduct)
      : step === 3
        ? Boolean(draft.date)
        : Boolean(draft.saleType);

  return (
    <div className="space-y-5">
      <Card className="bg-primary p-5 text-white">
        <p className="text-sm font-semibold text-blue-100">ACTIVIDAD DE VENTAS</p>
        <p className="mt-2 text-3xl font-bold">{filteredSales.length}</p>
        <p className="mt-1 text-base text-blue-100">{filteredSales.length === 1 ? 'venta registrada' : 'ventas registradas'} con estos filtros</p>
      </Card>

      <Button type="button" size="lg" className="w-full" onClick={openFlow}>
        <Plus aria-hidden="true" /> Registrar venta
      </Button>

      <section aria-labelledby="sales-filter-title">
        <h2 id="sales-filter-title" className="mb-3 text-xl font-bold">Filtrar ventas</h2>
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por fecha">
          {[
            ['all', 'Todas'],
            ['today', 'Hoy'],
            ['month', 'Este mes'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateFilter(value)}
              aria-pressed={dateFilter === value}
              className={`h-12 shrink-0 rounded-full px-5 text-[15px] font-bold ${dateFilter === value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-2 block text-[15px] font-bold text-muted-foreground">
          Producto
          <select
            value={productFilter}
            onChange={event => setProductFilter(event.target.value)}
            className="mt-2 h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px] text-foreground"
          >
            <option value="all">Todos los productos</option>
            {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
      </section>

      <section aria-labelledby="recent-sales-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="recent-sales-title" className="text-2xl font-bold">Ventas recientes</h2>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-muted-foreground shadow-card">{filteredSales.length}</span>
        </div>
        {filteredSales.length ? (
          <Card className="overflow-hidden">
            {filteredSales.map((sale, index) => (
              <div key={sale.id} className={`flex min-h-20 items-center gap-3 p-4 ${index ? 'border-t' : ''}`}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CircleDollarSign aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-bold">{sale.contact}</h3>
                  <p className="truncate text-[15px] text-muted-foreground">{sale.product}</p>
                  <p className="text-[14px] text-muted-foreground">{longDate.format(new Date(`${sale.date}T12:00:00`))}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-[14px] font-bold ${sale.saleType === 'recompra' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                  {sale.saleType === 'recompra' ? 'Recompra' : 'Nueva'}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-lg font-bold">No hay ventas con estos filtros</p>
            <button type="button" onClick={() => { setDateFilter('all'); setProductFilter('all'); }} className="mt-3 min-h-12 px-4 text-[16px] font-bold text-primary">
              Mostrar todas
            </button>
          </Card>
        )}
      </section>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-lg overflow-y-auto rounded-t-[28px] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
          {result ? (
            <div className="pb-2 pt-8 text-center">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
              </span>
              <SheetHeader className="mt-5 text-center">
                <SheetTitle className="text-2xl">Venta registrada</SheetTitle>
                <SheetDescription className="text-[16px] leading-relaxed">
                  Guardamos la venta para {result.contact} en esta demostración.
                </SheetDescription>
              </SheetHeader>
              <Card className="mt-6 p-5 text-left">
                <p className="text-[15px] text-muted-foreground">Producto</p>
                <p className="mt-1 text-[17px] font-bold">{result.product}</p>
                <p className="mt-3 text-[15px] text-muted-foreground">Tipo</p>
                <p className="mt-1 text-[17px] font-bold">{result.saleType === 'recompra' ? 'Recompra' : 'Nueva venta'}</p>
              </Card>
              <Button type="button" size="lg" className="mt-6 w-full" onClick={finishFlow}>
                <Check aria-hidden="true" /> Ver en la lista
              </Button>
              <Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white" onClick={resetFlow}>
                Registrar otra venta
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex min-h-12 items-center justify-between gap-3 pr-12">
                <button type="button" onClick={goBack} className="flex min-h-12 items-center gap-2 rounded-2xl px-2 text-[16px] font-bold text-primary">
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Atrás
                </button>
                <button type="button" onClick={cancelFlow} className="min-h-12 rounded-2xl px-3 text-[16px] font-bold text-muted-foreground">
                  Cancelar
                </button>
              </div>

              <SheetHeader className="text-left">
                <StepProgress step={step} />
                <SheetTitle className="pt-3 text-2xl">
                  {step === 1 && 'Elige un contacto'}
                  {step === 2 && 'Elige un producto'}
                  {step === 3 && 'Fecha de compra'}
                  {step === 4 && 'Revisa la venta'}
                </SheetTitle>
                <SheetDescription className="text-[16px]">
                  {step === 1 && 'Selecciona a la persona que hizo la compra.'}
                  {step === 2 && 'Selecciona qué producto compró.'}
                  {step === 3 && 'Confirma cuándo hizo la compra.'}
                  {step === 4 && 'Elige el tipo y confirma. Nada se guarda antes.'}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6">
                {step === 1 && (
                  <div className="space-y-3">
                    <label className="relative block">
                      <span className="sr-only">Buscar contacto</span>
                      <Search className="absolute left-4 top-4 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Buscar por nombre o teléfono"
                        className="h-14 w-full rounded-2xl border border-input bg-white pl-12 pr-4 text-[17px]"
                      />
                    </label>
                    {visibleContacts.map(contact => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setDraft(current => ({ ...current, contactId: contact.id }))}
                        aria-pressed={draft.contactId === contact.id}
                        className={`flex min-h-20 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${draft.contactId === contact.id ? 'border-primary bg-blue-50' : 'border-border bg-white'}`}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${draft.contactId === contact.id ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                          {draft.contactId === contact.id && <Check className="h-4 w-4" aria-hidden="true" />}
                        </span>
                        <span className="min-w-0"><strong className="block truncate text-[17px]">{contact.name}</strong><span className="block text-[15px] text-muted-foreground">{contact.phone}</span></span>
                      </button>
                    ))}
                    {!visibleContacts.length && <p className="rounded-2xl bg-muted p-5 text-center text-[16px]">No encontramos ese contacto.</p>}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    {products.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setDraft(current => ({ ...current, productId: product.id }))}
                        aria-pressed={draft.productId === product.id}
                        className={`flex min-h-20 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${draft.productId === product.id ? 'border-primary bg-blue-50' : 'border-border bg-white'}`}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${draft.productId === product.id ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                          {draft.productId === product.id && <Check className="h-4 w-4" aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1"><strong className="block text-[17px]">{product.name}</strong><span className="block text-[15px] text-muted-foreground">Toca para seleccionar</span></span>
                      </button>
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <label className="block text-[16px] font-bold">
                      Fecha de la venta
                      <input
                        type="date"
                        value={draft.date}
                        max={today()}
                        onChange={event => setDraft(current => ({ ...current, date: event.target.value }))}
                        className="mt-2 h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px]"
                      />
                    </label>
                  </div>
                )}

                {step === 4 && selectedContact && selectedProduct && (
                  <div className="space-y-5">
                    <Card className="divide-y overflow-hidden">
                      <dl>
                        <SummaryRow label="Contacto" value={selectedContact.name} />
                        <SummaryRow label="Producto" value={selectedProduct.name} />
                        <SummaryRow label="Fecha" value={longDate.format(new Date(`${draft.date}T12:00:00`))} />
                      </dl>
                    </Card>
                    <fieldset>
                      <legend className="mb-3 text-[17px] font-bold">Tipo de venta</legend>
                      <div className="space-y-3">
                        {saleTypeOptions.map(([value, title, description]) => (
                          <button key={value} type="button" onClick={() => setDraft(current => ({ ...current, saleType: value }))} aria-pressed={draft.saleType === value} className={`flex min-h-20 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${draft.saleType === value ? 'border-primary bg-blue-50' : 'border-border bg-white'}`}>
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${draft.saleType === value ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>{draft.saleType === value && <Check className="h-4 w-4" aria-hidden="true" />}</span>
                            <span><strong className="block text-[17px]">{title}</strong><span className="text-[15px] text-muted-foreground">{description}</span></span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                )}
              </div>

              {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-[15px] font-bold text-red-700" role="alert">{error}</p>}

              <Button type="button" size="lg" className="mt-6 w-full" disabled={!canContinue} onClick={step === 4 ? registerSale : goNext}>
                {step === 4 ? 'Registrar venta' : 'Continuar'}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
