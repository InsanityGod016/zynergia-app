import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import StateView from '@/components/ui/StateView';
import { Input } from '@/components/ui/input';
import { orderTemplatesForTask } from '@/lib/templateResolution';
import { defaultTaskSchedule, isFutureTaskSchedule } from '@/lib/taskSchedule';

const reasons = [
  { value: 'recompra', label: 'Recompra', category: 'recompra', area: 'producto', situation: 'repurchase' },
  { value: 'producto', label: 'Seguimiento de producto', category: 'seguimiento', area: 'producto', situation: 'product' },
  { value: 'prospecto_producto', label: 'Prospecto de producto', category: 'seguimiento', area: 'prospecto_producto', situation: 'product-prospect' },
  { value: 'prospecto_partner', label: 'Prospecto de negocio', category: 'seguimiento', area: 'prospecto_partner', situation: 'business' },
  { value: 'partner', label: 'Partner / Fast Start', category: 'seguimiento', area: 'partner', situation: 'fast-start' },
  { value: 'referidos', label: 'Pedir referido', category: 'seguimiento', area: 'referidos', situation: 'referral' },
  { value: 'manual', label: 'Otro recordatorio', category: 'seguimiento', area: 'manual', situation: 'manual' },
];

const draftKey = 'zynergia:new-task-draft:v1';
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function todayString() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function readDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey) || '{}');
  } catch {
    return {};
  }
}

function StepHeader({ step, title, onBack, onCancel }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
      <button type="button" onClick={onBack} className="-ml-2 flex min-h-12 items-center gap-1 rounded-xl px-2 text-[16px] font-bold text-primary">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {step === 1 ? 'Cancelar' : 'Atrás'}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-muted-foreground">Paso {step} de 4</p>
        <h1 className="truncate text-xl font-bold text-foreground">{title}</h1>
      </div>
      {step > 1 && <button type="button" onClick={onCancel} className="min-h-12 rounded-xl px-2 text-[15px] font-bold text-muted-foreground">Cancelar</button>}
    </header>
  );
}

export default function NewTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initial = useMemo(readDraft, []);
  const initialSchedule = useMemo(() => defaultTaskSchedule(), []);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [contactId, setContactId] = useState(initial.contactId || '');
  const [reason, setReason] = useState(initial.reason || '');
  const [dueDate, setDueDate] = useState(initial.dueDate || initialSchedule.date);
  const [dueTime, setDueTime] = useState(initial.dueTime || initialSchedule.time);
  const [productId, setProductId] = useState(initial.productId || '');
  const [templateId, setTemplateId] = useState(initial.templateId || '');
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const templatesQuery = useQuery({ queryKey: ['templates'], queryFn: () => db.Template.list() });
  const contacts = contactsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const selectedReason = reasons.find(item => item.value === reason);
  const selectedContact = contacts.find(item => item.id === contactId);
  const selectedProduct = products.find(item => item.id === productId);
  const selectedTemplate = templates.find(item => item.id === templateId);

  const suggestedTemplates = useMemo(() => {
    if (!selectedReason) return [];
    return orderTemplatesForTask(templates, { situation: selectedReason.situation }, selectedContact);
  }, [selectedContact, selectedReason, templates]);

  const allAvailableTemplates = useMemo(() => {
    const eligible = templates.filter(template => !template.contact_id || String(template.contact_id) === String(selectedContact?.id));
    const suggestedIds = new Set(suggestedTemplates.map(template => String(template.id)));
    return [...suggestedTemplates, ...eligible.filter(template => !suggestedIds.has(String(template.id))).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))];
  }, [selectedContact?.id, suggestedTemplates, templates]);

  const availableTemplates = showAllTemplates ? allAvailableTemplates : suggestedTemplates;

  const filteredContacts = useMemo(() => {
    const query = normalize(search);
    if (!query) return contacts;
    return contacts.filter(contact => normalize(`${contact.full_name} ${contact.phone}`).includes(query));
  }, [contacts, search]);

  const saveDraft = values => {
    const next = { contactId, reason, dueDate, dueTime, productId, templateId, ...values };
    sessionStorage.setItem(draftKey, JSON.stringify(next));
  };

  const goNext = () => {
    saveDraft({});
    setStep(current => Math.min(current + 1, 4));
  };

  const cancel = () => {
    const hasDraft = contactId || reason || productId || templateId;
    if (hasDraft && !window.confirm('¿Salir sin guardar esta tarea?')) return;
    sessionStorage.removeItem(draftKey);
    navigate(createPageUrl('Tasks'));
  };

  const createMutation = useMutation({
    mutationFn: () => db.Task.create({
      contact_id: contactId,
      product_id: productId || null,
      category: selectedReason.category,
      subcategory: selectedTemplate?.subcategory || reason,
      template_subcategory: selectedTemplate?.id || selectedTemplate?.subcategory || reason,
      task_name: selectedReason.label,
      task_area: selectedReason.area,
      due_date: dueDate,
      due_time: dueTime,
      completed: false,
      origin: 'manual',
    }),
    onSuccess: async () => {
      sessionStorage.removeItem(draftKey);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(createPageUrl('Tasks'), { replace: true });
    },
  });

  const isLoading = contactsQuery.isLoading || productsQuery.isLoading || templatesQuery.isLoading;
  const hasError = contactsQuery.isError || productsQuery.isError || templatesQuery.isError;
  const retry = () => Promise.all([contactsQuery.refetch(), productsQuery.refetch(), templatesQuery.refetch()]);
  const needsProduct = ['recompra', 'producto', 'prospecto_producto'].includes(reason);
  const scheduleIsFuture = isFutureTaskSchedule(dueDate, dueTime);
  const canFinish = selectedContact && selectedReason && scheduleIsFuture && selectedTemplate && (!needsProduct || selectedProduct);

  if (isLoading) return <main className="min-h-dvh bg-background px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Preparando la tarea" /></main>;
  if (hasError) return <main className="min-h-dvh bg-background px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="No pudimos preparar la tarea" description="Tu borrador sigue guardado." actionLabel="Intentar de nuevo" onAction={retry} /></main>;

  const titles = ['Elige un contacto', '¿Para qué es?', 'Elige fecha y hora', 'Revisa la tarea'];

  return (
    <main className="min-h-dvh bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <StepHeader step={step} title={titles[step - 1]} onBack={step === 1 ? cancel : () => setStep(current => current - 1)} onCancel={cancel} />

      <section className="mx-auto max-w-lg px-5 py-5">
        {step === 1 && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre o teléfono" className="h-14 rounded-2xl pl-12 text-[17px]" />
            </div>
            <div className="mt-4 space-y-3">
              {filteredContacts.map(contact => (
                <button key={contact.id} type="button" onClick={() => { setContactId(contact.id); saveDraft({ contactId: contact.id }); }} aria-pressed={contactId === contact.id} className={`min-h-16 w-full rounded-2xl border-2 bg-card p-4 text-left ${contactId === contact.id ? 'border-primary' : 'border-border'}`}>
                  <span className="block text-[17px] font-bold text-foreground">{contact.full_name}</span>
                  <span className="mt-1 block text-[15px] text-muted-foreground">{contact.phone || 'Sin teléfono'}</span>
                </button>
              ))}
              {!filteredContacts.length && <StateView state="empty" title="No encontramos contactos" description="Prueba otro nombre o crea primero el contacto." actionLabel="Crear contacto" onAction={() => navigate(createPageUrl('NewContact'))} />}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {reasons.map(item => (
              <button key={item.value} type="button" onClick={() => {
                const nextProductId = ['recompra', 'producto'].includes(item.value) ? productId : '';
                setReason(item.value);
                setTemplateId('');
                setShowAllTemplates(false);
                setProductId(nextProductId);
                saveDraft({ reason: item.value, templateId: '', productId: nextProductId });
              }} aria-pressed={reason === item.value} className={`flex min-h-16 w-full items-center justify-between rounded-2xl border-2 bg-card p-4 text-left text-[17px] font-semibold ${reason === item.value ? 'border-primary' : 'border-border'}`}>
                {item.label}
                {reason === item.value && <Check className="h-6 w-6 text-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="task-date" className="text-[17px] font-bold text-foreground">¿Qué día quieres hacerlo?</label>
              <input id="task-date" type="date" min={todayString()} value={dueDate} onChange={event => { setDueDate(event.target.value); saveDraft({ dueDate: event.target.value }); }} className="mt-3 min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label htmlFor="task-time" className="text-[17px] font-bold text-foreground">¿A qué hora quieres el recordatorio?</label>
              <input id="task-time" type="time" value={dueTime} onChange={event => { setDueTime(event.target.value); saveDraft({ dueTime: event.target.value }); }} className="mt-3 min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <p className="text-[15px] leading-relaxed text-muted-foreground">Zynergia te avisará en la fecha y hora que elijas.</p>
            {dueDate && dueTime && !scheduleIsFuture && <p className="rounded-2xl bg-destructive/5 p-4 text-[15px] font-semibold text-destructive" role="alert">Elige una fecha y hora futuras.</p>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            {needsProduct && (
              <div>
                <label htmlFor="task-product" className="text-[17px] font-bold text-foreground">Producto</label>
                <select id="task-product" value={productId} onChange={event => { setProductId(event.target.value); saveDraft({ productId: event.target.value }); }} className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px] text-foreground">
                  <option value="">Elige un producto</option>
                  {products.filter(product => !product.archived_at).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="task-template" className="text-[17px] font-bold text-foreground">Mensaje</label>
              <select id="task-template" value={templateId} onChange={event => { setTemplateId(event.target.value); saveDraft({ templateId: event.target.value }); }} className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px] text-foreground">
                <option value="">{showAllTemplates ? 'Elige cualquier plantilla' : 'Elige una sugerida'}</option>
                {availableTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowAllTemplates(value => !value)} className="mt-2 min-h-12 rounded-xl px-2 text-[15px] font-bold text-primary">
                {showAllTemplates ? 'Ver sólo sugeridas' : `Ver todas (${allAvailableTemplates.length})`}
              </button>
              {!showAllTemplates && <p className="text-[15px] leading-6 text-muted-foreground">Primero aparecen las plantillas configuradas para este contacto y motivo.</p>}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-[17px] font-bold text-foreground">Resumen</h2>
              <dl className="mt-4 space-y-3 text-[16px]">
                <div><dt className="text-muted-foreground">Contacto</dt><dd className="font-bold text-foreground">{selectedContact?.full_name}</dd></div>
                <div><dt className="text-muted-foreground">Motivo</dt><dd className="font-bold text-foreground">{selectedReason?.label}</dd></div>
                {selectedProduct && <div><dt className="text-muted-foreground">Producto</dt><dd className="font-bold text-foreground">{selectedProduct.name}</dd></div>}
                <div><dt className="text-muted-foreground">Fecha</dt><dd className="font-bold text-foreground">{dueDate}</dd></div>
                <div><dt className="text-muted-foreground">Hora</dt><dd className="font-bold text-foreground">{dueTime}</dd></div>
              </dl>
            </div>
            {createMutation.isError && <p className="rounded-2xl bg-destructive/5 p-4 text-[15px] font-semibold text-destructive" role="alert">No pudimos guardar. Tus datos siguen aquí. Intenta de nuevo.</p>}
          </div>
        )}
      </section>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        {step < 4 ? (
          <button type="button" onClick={goNext} disabled={(step === 1 && !contactId) || (step === 2 && !reason) || (step === 3 && !scheduleIsFuture)} className="min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-bold text-primary-foreground disabled:opacity-50">Continuar</button>
        ) : (
          <button type="button" onClick={() => createMutation.mutate()} disabled={!canFinish || createMutation.isPending} className="min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-bold text-primary-foreground disabled:opacity-50">
            {createMutation.isPending ? 'Guardando…' : 'Crear tarea'}
          </button>
        )}
      </footer>
    </main>
  );
}
