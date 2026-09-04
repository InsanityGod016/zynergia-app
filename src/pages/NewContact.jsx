import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TagAutocomplete from '@/components/contacts/TagAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createPartnerTasks,
  createProspectoProductoTasks,
  createProspectoPartnerTasks,
  createReferralTask,
} from '@/components/tasks/taskEngine';
import PhoneField from '@/components/contacts/PhoneField';
import { normalizePhone } from '@/lib/phone';

/**
 * @typedef {{
 *   full_name: string,
 *   phone: string,
 *   country_code: string,
 *   notes: string,
 *   tag_ids: string[],
 *   contact_type: string,
 * }} ContactForm
 */

export default function NewContact() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(/** @type {ContactForm} */ ({
    full_name: '',
    phone: '',
    country_code: '+52',
    notes: '',
    tag_ids: [],
    contact_type: ''
  }));
  const [phoneError, setPhoneError] = useState('');

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  const createMutation = useMutation({
    mutationFn: async (/** @type {ContactForm} */ data) => {
      const contact = await db.Contact.create(data);
      // Auto-create prospecto task sequences (only if type is set)
      if (data.contact_type === 'prospecto_producto') {
        await createProspectoProductoTasks({ contactId: contact.id, existingTasks: allTasks });
      } else if (data.contact_type === 'prospecto_partner') {
        await createProspectoPartnerTasks({ contactId: contact.id, existingTasks: allTasks });
      } else if (data.contact_type === 'partner') {
        const now = new Date();
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 120);
        const startDate = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
        ].join('-');
        const fastStartDeadline = [
          deadline.getFullYear(),
          String(deadline.getMonth() + 1).padStart(2, '0'),
          String(deadline.getDate()).padStart(2, '0'),
        ].join('-');
        await db.Partner.create({
          contact_id: contact.id,
          start_date: startDate,
          fast_start_deadline: fastStartDeadline,
          fast_start_status: 'activo',
          fase_actual: 1,
          qteam_completed: false,
          fs_level1_completed: false,
          fs_level2_completed: false,
          xteam_completed: false,
        });
        await createPartnerTasks({ contactId: contact.id, startDate });
      }
      // Tarea de referido para clientes y partners (30 días desde registro)
      if (data.contact_type === 'cliente_producto' || data.contact_type === 'partner') {
        await createReferralTask({
          contactId: contact.id,
          contactCreatedAt: contact.created_at,
          existingTasks: allTasks
        });
      }
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      navigate(createPageUrl('Contacts'));
    }
  });

  const handleSubmit = () => {
    if (!formData.full_name || !formData.phone) return;
    const normalized = normalizePhone(formData.country_code, formData.phone);
    if (!normalized.valid) {
      setPhoneError('Revisa el número y el código de país.');
      return;
    }
    const payload = { ...formData, phone: normalized.e164 };
    if (!payload.contact_type) delete payload.contact_type;
    createMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(createPageUrl('Contacts'))}
          className="-ml-2 flex h-12 w-12 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Volver a contactos"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f] ml-2">Nuevo contacto</h1>
      </div>

      <div className="px-5 space-y-5 pb-24">
        <div>
          <Label htmlFor="contact-name">Nombre completo</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Nombre del contacto"
            className="mt-1.5 h-14 rounded-2xl text-[17px]"
          />
        </div>

        <div>
          <Label htmlFor="contact-phone">Teléfono</Label>
          <div className="mt-1.5">
            <PhoneField
              id="contact-phone"
              dialCode={formData.country_code}
              nationalNumber={formData.phone}
              onDialCodeChange={(countryCode) => {
                setFormData(current => ({ ...current, country_code: countryCode }));
                setPhoneError('');
              }}
              onNationalNumberChange={(phone) => {
                setFormData(current => ({ ...current, phone }));
                setPhoneError('');
              }}
              invalid={Boolean(phoneError)}
              describedBy={phoneError ? 'contact-phone-error' : 'contact-phone-help'}
            />
          </div>
          <p id="contact-phone-help" className="mt-2 text-[15px] text-muted-foreground">Elige el país y escribe el número. Puedes pegarlo con código de país.</p>
          {phoneError && <p id="contact-phone-error" className="mt-2 text-[15px] text-destructive" role="alert">{phoneError}</p>}
        </div>

        <div>
          <Label>Tipo de contacto</Label>
          <Select
            value={formData.contact_type || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, contact_type: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="mt-1.5 h-14 rounded-2xl text-[17px]">
              <SelectValue placeholder="Sin tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin tipo</SelectItem>
              <SelectItem value="prospecto_producto">Prospecto producto</SelectItem>
              <SelectItem value="prospecto_partner">Prospecto partner</SelectItem>
              <SelectItem value="cliente_producto">Cliente producto</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Etiquetas</Label>
          <div className="mt-1.5">
            <TagAutocomplete
              selectedTagIds={formData.tag_ids}
              onChange={(tagIds) => setFormData({ ...formData, tag_ids: tagIds })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="contact-notes">Notas (opcional)</Label>
          <Textarea
            id="contact-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales..."
            className="mt-1.5 min-h-28 rounded-2xl text-[17px]"
          />
        </div>

        {createMutation.isError && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4" role="alert">
            <p className="font-semibold text-destructive">No pudimos crear el contacto.</p>
            <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
              Tus datos siguen aquí. Revisa tu conexión e intenta de nuevo.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#EAEAEA]">
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !formData.full_name || !formData.phone}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#004afe] text-[17px] font-semibold text-white hover:bg-[#003bd1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>Crear contacto</span>
          <Check className="w-5 h-5 ml-auto" />
        </button>
      </div>
    </div>
  );
}
