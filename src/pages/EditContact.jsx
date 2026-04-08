import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export default function EditContact() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const contactId = params.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    notes: '',
    tag_ids: [],
    contact_type: 'prospecto_producto'
  });

  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => db.Contact.filter({ id: contactId }),
    select: (data) => data[0]
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        full_name: contact.full_name || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        tag_ids: contact.tag_ids || [],
        contact_type: contact.contact_type || 'prospecto_producto'
      });
    }
  }, [contact]);

  const updateMutation = useMutation({
    mutationFn: (data) => db.Contact.update(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      navigate(createPageUrl(`ContactDetail?id=${contactId}`));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => db.Contact.delete(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      navigate(createPageUrl('Contacts'));
    }
  });

  const handleSubmit = () => {
    if (!formData.full_name || !formData.phone) return;
    updateMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate(createPageUrl(`ContactDetail?id=${contactId}`))}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="w-6 h-6 text-[#27251f]" />
          </button>
          <h1 className="text-lg font-semibold text-[#27251f] ml-2">Editar contacto</h1>
        </div>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-10 h-10 flex items-center justify-center -mr-2"
        >
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>
      </div>

      <div className="px-5 space-y-5 pb-6">
        <div>
          <Label>Nombre completo</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Nombre del contacto"
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>

        <div>
          <Label>Teléfono</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+52 55 1234 5678"
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>

        <div>
          <Label>Tipo de contacto</Label>
          <Select
            value={formData.contact_type}
            onValueChange={(v) => setFormData({ ...formData, contact_type: v })}
          >
            <SelectTrigger className="mt-1.5 h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            className="mt-1.5 h-24 rounded-xl"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || !formData.full_name || !formData.phone}
          className="w-full h-12 bg-[#004afe] hover:bg-[#330077] text-white rounded-xl text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar cambios
        </button>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todas las ventas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}