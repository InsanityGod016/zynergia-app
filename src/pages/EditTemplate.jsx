import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const categoryLabels = {
  seguimiento: 'Seguimiento',
  recompra: 'Recompra',
  reactivacion: 'Reactivación'
};

const toneLabels = {
  general: 'General',
  amigable: 'Amigable',
  directo: 'Directo'
};

export default function EditTemplate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('id');

  const [content, setContent] = useState('');

  const { data: template } = useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const templates = await db.Template.list();
      return templates.find(t => t.id === templateId);
    },
    enabled: !!templateId
  });

  useEffect(() => {
    if (template) {
      setContent(template.content);
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: (data) => db.Template.update(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate(createPageUrl('Templates'));
    }
  });

  const handleSave = () => {
    if (!content.trim()) return;
    updateMutation.mutate({ content });
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    
    // Protect variables - prevent deletion of {{contact.full_name}}, {{product.name}}, {{product.link_URL}}
    const protectedVars = [
      '{{contact.full_name}}',
      '{{product.name}}',
      '{{product.link_URL}}'
    ];
    
    // Check if any protected variable was removed
    const currentVars = content.match(/\{\{[^}]+\}\}/g) || [];
    const newVars = newContent.match(/\{\{[^}]+\}\}/g) || [];
    
    let hasRemovedProtected = false;
    currentVars.forEach(v => {
      if (protectedVars.includes(v) && !newVars.includes(v)) {
        hasRemovedProtected = true;
      }
    });

    if (hasRemovedProtected) {
      // Don't allow the change if a protected variable was removed
      return;
    }

    setContent(newContent);
  };

  if (!template) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6E6E73]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl('Templates'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f]">Editar Plantilla</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-6">
        {/* Non-editable fields */}
        <div>
          <Label className="text-[#6E6E73] text-sm">Nombre</Label>
          <div className="mt-1.5 px-4 py-3 bg-[#F5F5F5] rounded-xl text-[15px] text-[#27251f]">
            {template.name}
          </div>
        </div>

        <div>
          <Label className="text-[#6E6E73] text-sm">Categoría</Label>
          <div className="mt-1.5 px-4 py-3 bg-[#F5F5F5] rounded-xl text-[15px] text-[#27251f]">
            {categoryLabels[template.category] || template.category}
          </div>
        </div>

        <div>
          <Label className="text-[#6E6E73] text-sm">Subcategoría</Label>
          <div className="mt-1.5 px-4 py-3 bg-[#F5F5F5] rounded-xl text-[15px] text-[#27251f]">
            {template.subcategory}
          </div>
        </div>

        <div>
          <Label className="text-[#6E6E73] text-sm">Tono</Label>
          <div className="mt-1.5 px-4 py-3 bg-[#F5F5F5] rounded-xl text-[15px] text-[#27251f]">
            {toneLabels[template.tone] || template.tone}
          </div>
        </div>

        {/* Editable content */}
        <div>
          <Label className="text-[#27251f] text-sm">Contenido del mensaje</Label>
          <Textarea
            value={content}
            onChange={handleContentChange}
            className="mt-1.5 h-48 text-[15px] leading-relaxed"
            placeholder="Escribe tu mensaje aquí..."
          />
          <p className="mt-2 text-xs text-[#6E6E73]">
            Variables protegidas: {`{{contact.full_name}}, {{product.name}}, {{product.link_URL}}`}
          </p>
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#EAEAEA]">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !content.trim()}
          className="w-full bg-[#004AFE] hover:bg-[#0039CC] rounded-full h-12 text-base font-medium"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}