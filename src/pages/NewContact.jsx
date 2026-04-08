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
import { createProspectoProductoTasks, createProspectoPartnerTasks, createReferralTask } from '@/components/tasks/taskEngine';

export default function NewContact() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    country_code: '+52',
    notes: '',
    tag_ids: [],
    contact_type: ''
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const contact = await db.Contact.create(data);
      // Auto-create prospecto task sequences (only if type is set)
      if (data.contact_type === 'prospecto_producto') {
        await createProspectoProductoTasks({ contactId: contact.id, existingTasks: allTasks });
      } else if (data.contact_type === 'prospecto_partner') {
        await createProspectoPartnerTasks({ contactId: contact.id, existingTasks: allTasks });
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
      navigate(createPageUrl('Contacts'));
    }
  });

  const handleSubmit = () => {
    if (!formData.full_name || !formData.phone) return;
    const phoneWithCountry = formData.country_code + formData.phone;
    const payload = { ...formData, phone: phoneWithCountry };
    if (!payload.contact_type) delete payload.contact_type;
    createMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center">
        <button
          onClick={() => navigate(createPageUrl('Contacts'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f] ml-2">Nuevo contacto</h1>
      </div>

      <div className="px-5 space-y-5 pb-24">
        <div>
          <Label>Nombre completo</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Nombre del contacto"
            className="mt-1.5 h-12 rounded-full"
          />
        </div>

        <div>
          <Label>Teléfono</Label>
          <div className="flex gap-2 mt-1.5">
            <select
              value={formData.country_code}
              onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
              className="w-24 h-12 px-3 rounded-full border border-[#EAEAEA] text-sm bg-white"
            >
              <option value="+52">🇲🇽 +52</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+34">🇪🇸 +34</option>
              <option value="+57">🇨🇴 +57</option>
            </select>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="55 1234 5678"
              className="flex-1 h-12 rounded-full"
            />
          </div>
        </div>

        <div>
          <Label>Tipo de contacto</Label>
          <Select
            value={formData.contact_type || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, contact_type: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="mt-1.5 h-12 rounded-full">
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
          <Label>Notas (opcional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales..."
            className="mt-1.5 h-24 rounded-3xl"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#EAEAEA]">
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !formData.full_name || !formData.phone}
          className="w-full h-12 bg-[#004afe] hover:bg-[#330077] text-white rounded-full text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>Crear contacto</span>
          <Check className="w-5 h-5 ml-auto" />
        </button>
      </div>
    </div>
  );
}