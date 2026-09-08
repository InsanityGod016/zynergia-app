import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clipboard, MessageCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { whatsappUrl } from '@/lib/phone';
import { orderTemplatesForTask, resolveTemplateForTask } from '@/lib/templateResolution';
import StateView from '@/components/ui/StateView';
import { Button } from '@/components/ui/button';

const toneLabels = {
  general: 'General',
  amigable: 'Amigable',
  directo: 'Directo',
};

function fillTemplate(content, contact, product) {
  return (content || '')
    .replace(/\{\{contact\.full_name\}\}/g, contact?.full_name || '')
    .replace(/\{\{product\.name\}\}/g, product?.name || '')
    .replace(/\{\{product\.link_URL\}\}/g, product?.link_url || '')
    .replace(/\{\{product\.link_url\}\}/g, product?.link_url || '');
}

export default function SelectMessageTone() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [selectedTone, setSelectedTone] = useState('general');
  const [copyStatus, setCopyStatus] = useState('');
  const [editedMessage, setEditedMessage] = useState('');

  const taskQuery = useQuery({ queryKey: ['tasks'], queryFn: () => db.Task.list() });
  const contactQuery = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const productQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const templateQuery = useQuery({ queryKey: ['templates'], queryFn: () => db.Template.list() });

  const task = taskQuery.data?.find(item => String(item.id) === String(taskId));
  const contact = contactQuery.data?.find(item => item.id === task?.contact_id);
  const product = productQuery.data?.find(item => item.id === task?.product_id);
  const templates = useMemo(
    () => task ? orderTemplatesForTask(templateQuery.data || [], task, contact) : [],
    [contact, task, templateQuery.data],
  );
  const toneOptions = useMemo(
    () => [...new Set(templates.map(template => template.tone || 'general'))],
    [templates],
  );
  const selectedTemplate = resolveTemplateForTask(templates, task, contact, selectedTone);
  const message = fillTemplate(selectedTemplate?.content, contact, product);
  const verifiedPhone = contact?.phone_e164 || contact?.phone || '';
  const phoneIsVerified = /^\+\d{8,15}$/.test(String(verifiedPhone));
  const needsProductLink = selectedTemplate?.content?.includes('{{product.link_') && !product?.link_url;
  const isLoading = taskQuery.isLoading || contactQuery.isLoading || productQuery.isLoading || templateQuery.isLoading;
  const hasError = taskQuery.isError || contactQuery.isError || productQuery.isError || templateQuery.isError;

  useEffect(() => {
    const preferredTone = templates[0]?.tone || toneOptions[0];
    if (preferredTone) setSelectedTone(preferredTone);
  }, [taskId, templates[0]?.id, templates[0]?.tone, toneOptions[0]]);

  useEffect(() => {
    if (!taskId || !selectedTemplate?.id || !message) return;
    const key = `zynergia:message-draft:${taskId}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '{}');
      setEditedMessage(saved.templateId === selectedTemplate.id ? saved.message : message);
    } catch {
      setEditedMessage(message);
    }
  }, [message, selectedTemplate?.id, taskId]);

  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('Tasks'));
  const retry = () => Promise.all([
    taskQuery.refetch(),
    contactQuery.refetch(),
    productQuery.refetch(),
    templateQuery.refetch(),
  ]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopyStatus('Mensaje copiado.');
    } catch {
      setCopyStatus('No se pudo copiar. Mantén presionado el mensaje para seleccionarlo.');
    }
  };

  const openWhatsApp = () => {
    const url = phoneIsVerified && !needsProductLink ? whatsappUrl(verifiedPhone, editedMessage) : '';
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const updateMessage = value => {
    setEditedMessage(value);
    setCopyStatus('');
    if (!taskId || !selectedTemplate?.id) return;
    sessionStorage.setItem(`zynergia:message-draft:${taskId}`, JSON.stringify({ templateId: selectedTemplate.id, message: value }));
  };

  if (isLoading) {
    return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Preparando tu mensaje" description="Estamos reuniendo la tarea y el contacto." /></main>;
  }

  if (hasError) {
    return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="No pudimos preparar el mensaje" description="Tus datos siguen guardados. Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={retry} /></main>;
  }

  if (!taskId || !task || !contact) {
    return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="Esta tarea ya no está disponible" description="Vuelve a Hoy para elegir otra tarea." actionLabel="Volver a Hoy" onAction={() => navigate(createPageUrl('Tasks'), { replace: true })} /></main>;
  }

  if (!templates.length || !message) {
    return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="Falta el mensaje de esta tarea" description="La tarea sigue guardada. Revisa tus plantillas y vuelve a intentarlo." actionLabel="Abrir plantillas" onAction={() => navigate(createPageUrl('Templates'))} /></main>;
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="border-b border-slate-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={goBack} className="flex min-h-12 items-center gap-2 rounded-2xl pr-3 text-[17px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex h-12 w-12 items-center justify-center"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></span>
          Volver
        </button>
      </header>

      <section className="mx-auto max-w-lg px-5 py-6">
        <p className="text-[15px] font-semibold text-primary">Mensaje para {contact.full_name}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{task.task_name || 'Seguimiento'}</h1>
        {product && <p className="mt-2 text-[15px] text-muted-foreground">Producto: {product.name}</p>}

        <fieldset className="mt-6">
          <legend className="mb-3 text-[16px] font-bold">Elige cómo quieres decirlo</legend>
          <div className="grid grid-cols-3 gap-2">
            {toneOptions.map(tone => (
              <button
                key={tone}
                type="button"
                onClick={() => { setSelectedTone(tone); setCopyStatus(''); }}
                aria-pressed={selectedTone === tone}
                className={`min-h-12 rounded-2xl px-2 text-[15px] font-bold ${selectedTone === tone ? 'bg-primary text-white' : 'bg-white text-muted-foreground shadow-sm'}`}
              >
                {toneLabels[tone] || tone}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="outgoing-message" className="mb-2 block text-[15px] font-bold text-muted-foreground">REVISA EL MENSAJE</label>
          <textarea
            id="outgoing-message"
            value={editedMessage}
            onChange={event => updateMessage(event.target.value)}
            className="min-h-44 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[17px] leading-relaxed text-slate-950 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Los cambios son sólo para este envío. La plantilla original no cambia.</p>
        </div>

        {needsProductLink && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-950" role="status">
            Este producto todavía no tiene enlace. Agrégalo para evitar enviar un mensaje incompleto.
          </p>
        )}
        {needsProductLink && product && (
          <Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white" onClick={() => {
            const returnTo = `${createPageUrl('SelectMessageTone')}?taskId=${encodeURIComponent(taskId)}`;
            navigate(`${createPageUrl('EditProduct')}?id=${encodeURIComponent(product.id)}&returnTo=${encodeURIComponent(returnTo)}`);
          }}>
            Agregar enlace del producto
          </Button>
        )}
        {!phoneIsVerified && (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-[15px] leading-relaxed text-red-800" role="alert">
            El teléfono de {contact.full_name} no tiene un código de país confirmado. Corrígelo antes de abrir WhatsApp.
          </p>
        )}
        {copyStatus && <p className="mt-4 text-[15px] font-semibold text-primary" role="status">{copyStatus}</p>}

        <div className="mt-6 space-y-3">
          <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!phoneIsVerified || needsProductLink || !editedMessage.trim()} onClick={openWhatsApp}>
            <MessageCircle aria-hidden="true" /> Abrir WhatsApp
          </Button>
          <Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={copyMessage}>
            <Clipboard aria-hidden="true" /> Copiar mensaje
          </Button>
          {!phoneIsVerified && (
            <Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={() => navigate(createPageUrl(`EditContact?id=${contact.id}`))}>
              Agregar teléfono
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
