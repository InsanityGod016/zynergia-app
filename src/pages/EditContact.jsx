import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import TagAutocomplete from '@/components/contacts/TagAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  cancelFutureTasksByArea,
  createPartnerTasks,
  createProspectoPartnerTasks,
  createProspectoProductoTasks,
  createReferralTask,
} from '@/components/tasks/taskEngine';
import PhoneField from '@/components/contacts/PhoneField';
import { normalizePhone, splitPhone } from '@/lib/phone';
import { COUNTRY_CODES } from '@/lib/countryCodes';

/**
 * @typedef {{
 *   full_name: string,
 *   phone: string,
 *   country_code: string,
 *   phone_country_iso: string,
 *   phone_e164?: string,
 *   phone_raw?: string,
 *   import_source?: string,
 *   notes: string,
 *   tag_ids: string[],
 *   contact_type: string,
 * }} ContactForm
 */

/** @type {ContactForm} */
const emptyForm = {
  full_name: '',
  phone: '',
  country_code: '+52',
  phone_country_iso: 'MX',
  notes: '',
  tag_ids: [],
  contact_type: '',
};

function formFromContact(contact) {
  const parsedPhone = splitPhone(contact.phone_e164 || contact.phone, contact.country_code || '+52');
  const matchingCountries = COUNTRY_CODES.filter(country => country.code === parsedPhone.dialCode);
  const inferredCountryIso = matchingCountries.length === 1 ? matchingCountries[0].iso : '';
  return {
    full_name: contact.full_name || '',
    phone: parsedPhone.nationalNumber,
    country_code: parsedPhone.dialCode,
    phone_country_iso: contact.phone_country_iso || inferredCountryIso,
    notes: contact.notes || '',
    tag_ids: contact.tag_ids || [],
    contact_type: contact.contact_type || '',
  };
}

function EditState(/** @type {{ title: string, description: string, actionLabel?: string, onAction?: () => unknown, onBack: () => void }} */ {
  title,
  description,
  actionLabel,
  onAction,
  onBack,
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-2xl pr-3 text-[17px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex h-12 w-12 items-center justify-center"><ArrowLeft aria-hidden="true" className="h-6 w-6" /></span>
          Volver
        </button>
      </header>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center" role="status">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted-foreground">{description}</p>
        {onAction && (
          <button type="button" onClick={onAction} className="mt-6 min-h-14 rounded-2xl bg-primary px-6 text-[17px] font-semibold text-primary-foreground">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EditContact() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('id');
  const [formData, setFormData] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(null);
  const [initializedContactId, setInitializedContactId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const contactQuery = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => db.Contact.filter({ id: contactId }),
    select: (data) => data[0],
    enabled: Boolean(contactId),
  });
  const contact = contactQuery.data;

  useEffect(() => {
    if (contact && initializedContactId !== contactId) {
      const nextForm = formFromContact(contact);
      setFormData(nextForm);
      setInitialForm(nextForm);
      setInitializedContactId(contactId);
      setFieldErrors({});
    }
  }, [contact, contactId, initializedContactId]);

  const isDirty = useMemo(
    () => Boolean(initialForm) && JSON.stringify(formData) !== JSON.stringify(initialForm),
    [formData, initialForm],
  );

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const detailUrl = createPageUrl(`ContactDetail?id=${contactId}`);
  const leaveEditor = useCallback(() => {
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate(detailUrl, { replace: true });
  }, [detailUrl, location.key, navigate]);
  const requestLeave = useCallback(() => {
    if (isDirty) setShowDiscardDialog(true);
    else leaveEditor();
  }, [isDirty, leaveEditor]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('zynergia:dirty-state', { detail: { dirty: isDirty } }));
  }, [isDirty]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent('zynergia:dirty-state', { detail: { dirty: false } }));
  }, []);

  useEffect(() => {
    const handleBackRequest = () => requestLeave();
    window.addEventListener('zynergia:request-back', handleBackRequest);
    return () => window.removeEventListener('zynergia:request-back', handleBackRequest);
  }, [requestLeave]);

  const setField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const updateMutation = useMutation({
    mutationFn: async (/** @type {ContactForm} */ data) => {
      const previousType = contact?.contact_type || null;
      const newType = data.contact_type || null;
      await db.Contact.update(contactId, { ...data, contact_type: newType });
      if (newType === previousType) return;

      const existingTasks = await db.Task.list();
      if (previousType === 'prospecto_produto' || previousType === 'prospecto_producto') {
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks });
      }
      if (previousType === 'prospecto_partner') {
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks });
      }
      if (!newType) {
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks });
        await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks });
      }
      if (newType === 'prospecto_producto') {
        await createProspectoProductoTasks({ contactId, existingTasks: await db.Task.list() });
      }
      if (newType === 'prospecto_partner') {
        await createProspectoPartnerTasks({ contactId, existingTasks: await db.Task.list() });
      }
      if (newType === 'partner') {
        const partners = await db.Partner.list();
        if (!partners.some((partner) => partner.contact_id === contactId)) {
          const startDate = new Date().toISOString().split('T')[0];
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 120);
          await db.Partner.create({
            contact_id: contactId,
            start_date: startDate,
            fast_start_deadline: deadline.toISOString().split('T')[0],
            fast_start_status: 'activo',
            fase_actual: 1,
            qteam_completed: false,
            fs_level1_completed: false,
            fs_level2_completed: false,
            xteam_completed: false,
          });
          await createPartnerTasks({ contactId, startDate });
        }
      }
      if (newType === 'cliente_producto' || newType === 'partner') {
        await createReferralTask({
          contactId,
          contactCreatedAt: contact?.created_at,
          existingTasks: await db.Task.list(),
        });
      }
    },
    onSuccess: async () => {
      setInitialForm(formData);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ]);
      navigate(detailUrl, { replace: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => db.Contact.anonymize(contactId),
    onSuccess: async () => {
      setInitialForm(formData);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
      ]);
      navigate(createPageUrl('Contacts'), { replace: true });
    },
  });

  const submit = (event) => {
    event.preventDefault();
    const errors = /** @type {Record<string, string>} */ ({});
    if (!formData.full_name.trim()) errors.full_name = 'Escribe el nombre del contacto.';
    const normalizedPhone = normalizePhone(formData.country_code, formData.phone);
    if (!normalizedPhone.valid) errors.phone = 'Revisa el número y el código de país.';
    if (!formData.phone_country_iso) errors.phone = 'Elige el país del número.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    updateMutation.mutate({
      ...formData,
      full_name: formData.full_name.trim(),
      phone: normalizedPhone.e164,
      phone_e164: normalizedPhone.e164,
      phone_country_iso: formData.phone_country_iso,
      phone_raw: formData.phone,
      import_source: 'manual',
      notes: formData.notes.trim(),
    });
  };

  if (!contactId) {
    return <EditState title="No encontramos este contacto" description="El enlace está incompleto." actionLabel="Volver a contactos" onAction={() => navigate(createPageUrl('Contacts'), { replace: true })} onBack={() => navigate(createPageUrl('Contacts'), { replace: true })} />;
  }
  if (contactQuery.isError) {
    return <EditState title="No pudimos abrir el contacto" description="Revisa tu conexión. Tus datos siguen seguros." actionLabel="Intentar de nuevo" onAction={() => contactQuery.refetch()} onBack={requestLeave} />;
  }
  if (contactQuery.isPending) {
    return <EditState title="Cargando contacto" description="Esto sólo tomará un momento." onBack={requestLeave} />;
  }
  if (!contact) {
    return <EditState title="Contacto no disponible" description="Puede que haya sido eliminado o que este enlace ya no funcione." actionLabel="Volver a contactos" onAction={() => navigate(createPageUrl('Contacts'), { replace: true })} onBack={requestLeave} />;
  }
  if (!initialForm || initializedContactId !== contactId) {
    return <EditState title="Preparando formulario" description="Esto sólo tomará un momento." onBack={requestLeave} />;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 flex items-center border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={requestLeave}
          className="flex min-h-12 items-center gap-2 rounded-2xl pr-3 text-[17px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Volver al contacto"
        >
          <span className="flex h-12 w-12 items-center justify-center"><ArrowLeft aria-hidden="true" className="h-6 w-6" /></span>
          Volver
        </button>
        <h1 className="ml-auto pr-2 text-xl font-bold text-foreground">Editar</h1>
      </header>

      <form id="edit-contact-form" onSubmit={submit} noValidate className="space-y-6 px-4 py-5 sm:px-5">
        <div>
          <label htmlFor="contact-name" className="block text-[15px] font-semibold text-foreground">Nombre completo</label>
          <input
            id="contact-name"
            value={formData.full_name}
            onChange={(event) => setField('full_name', event.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={fieldErrors.full_name ? 'contact-name-error' : undefined}
            className="mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px] text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {fieldErrors.full_name && <p id="contact-name-error" className="mt-2 text-[15px] text-destructive" role="alert">{fieldErrors.full_name}</p>}
        </div>

        <div>
          <label htmlFor="contact-phone" className="block text-[15px] font-semibold text-foreground">Teléfono</label>
          <div className="mt-2">
            <PhoneField
              id="contact-phone"
              dialCode={formData.country_code}
              countryIso={formData.phone_country_iso}
              nationalNumber={formData.phone}
              onDialCodeChange={value => setField('country_code', value)}
              onCountryIsoChange={value => setField('phone_country_iso', value)}
              onNationalNumberChange={value => setField('phone', value)}
              invalid={Boolean(fieldErrors.phone)}
              describedBy={fieldErrors.phone ? 'contact-phone-error' : 'contact-phone-help'}
            />
          </div>
          <p id="contact-phone-help" className="mt-2 text-[15px] text-muted-foreground">Confirma el país y el número antes de abrir WhatsApp.</p>
          {fieldErrors.phone && <p id="contact-phone-error" className="mt-2 text-[15px] text-destructive" role="alert">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label id="contact-type-label" className="block text-[15px] font-semibold text-foreground">Tipo de contacto</label>
          <Select value={formData.contact_type || '__none__'} onValueChange={(value) => setField('contact_type', value === '__none__' ? '' : value)}>
            <SelectTrigger aria-labelledby="contact-type-label" className="mt-2 h-14 rounded-2xl bg-card px-4 text-[17px]">
              <SelectValue placeholder="Sin tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="min-h-12 text-[17px]">Sin tipo</SelectItem>
              <SelectItem value="prospecto_producto" className="min-h-12 text-[17px]">Prospecto de producto</SelectItem>
              <SelectItem value="prospecto_partner" className="min-h-12 text-[17px]">Prospecto de negocio</SelectItem>
              <SelectItem value="cliente_producto" className="min-h-12 text-[17px]">Cliente</SelectItem>
              <SelectItem value="partner" className="min-h-12 text-[17px]">Socio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label id="contact-tags-label" className="block text-[15px] font-semibold text-foreground">Etiquetas</label>
          <div className="mt-2" aria-labelledby="contact-tags-label">
            <TagAutocomplete selectedTagIds={formData.tag_ids} onChange={(tagIds) => setField('tag_ids', tagIds)} />
          </div>
        </div>

        <div>
          <label htmlFor="contact-notes" className="block text-[15px] font-semibold text-foreground">Notas <span className="font-normal text-muted-foreground">(opcional)</span></label>
          <textarea
            id="contact-notes"
            value={formData.notes}
            onChange={(event) => setField('notes', event.target.value)}
            rows={5}
            placeholder="Escribe algo que quieras recordar"
            className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-[17px] leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>

        {updateMutation.isError && (
          <p className="rounded-2xl bg-destructive/5 p-4 text-[15px] leading-6 text-destructive" role="alert">
            No pudimos terminar de guardar todos los cambios. Tus datos siguen aquí. Intenta de nuevo.
          </p>
        )}

        <section className="border-t border-border pt-4" aria-labelledby="delete-contact-title">
          <h2 id="delete-contact-title" className="text-[17px] font-semibold text-foreground">Administrar contacto</h2>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="mt-2 min-h-12 rounded-xl px-3 text-left text-[17px] font-semibold text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            Eliminar contacto
          </button>
          {deleteMutation.isError && <p className="mt-2 text-[15px] text-destructive" role="alert">No pudimos eliminarlo. Tus datos no cambiaron. Intenta de nuevo.</p>}
        </section>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="submit"
          form="edit-contact-form"
          disabled={updateMutation.isPending || !isDirty}
          className="mx-auto block min-h-14 w-full max-w-lg rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Guardando…' : isDirty ? 'Guardar cambios' : 'Sin cambios pendientes'}
        </button>
      </div>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">Los cambios que hiciste en este formulario se perderán.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-12 text-[15px]">Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={leaveEditor} className="min-h-12 text-[15px]">Salir sin guardar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { if (!deleteMutation.isPending) setShowDeleteDialog(open); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Eliminar este contacto?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              Borraremos su nombre, teléfono, notas y tareas futuras. Las ventas históricas se conservarán sin datos personales como “Contacto eliminado”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && <p className="text-[15px] text-destructive" role="alert">No pudimos eliminarlo. Tus datos no cambiaron.</p>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-12 text-[15px]">Conservar contacto</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="min-h-12 bg-destructive text-[15px] text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar contacto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
