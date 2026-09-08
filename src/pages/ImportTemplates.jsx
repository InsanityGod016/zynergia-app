import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Download, LogIn } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '@/api/db';
import BrandMark from '@/components/ui/BrandMark';
import StateView from '@/components/ui/StateView';
import { useAuth } from '@/lib/AuthContext';
import {
  clearPendingTemplateShare,
  rememberPendingTemplateShare,
  templateSharePath,
} from '@/lib/app-links';
import { templateSituationLabel } from '@/lib/templateSharing';
import { createOperationId } from '@/lib/operationId';
import { createPageUrl } from '@/utils';

export default function ImportTemplates() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const route = templateSharePath(token);
  const normalizedToken = route?.split('/').pop() || '';
  const importOperationId = useMemo(() => createOperationId(), [normalizedToken]);

  useEffect(() => {
    if (route) rememberPendingTemplateShare(route);
  }, [route]);

  const previewQuery = useQuery({
    queryKey: ['template-share-preview', normalizedToken],
    queryFn: () => db.TemplateShare.preview(normalizedToken),
    enabled: Boolean(route) && !isLoadingAuth && isAuthenticated,
    retry: false,
  });

  const importMutation = useMutation({
    mutationFn: () => db.TemplateShare.import(importOperationId, normalizedToken),
    onSuccess: async result => {
      clearPendingTemplateShare();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['templates'] }),
        queryClient.invalidateQueries({ queryKey: ['template-categories'] }),
      ]);
      return result;
    },
  });

  const leave = () => {
    clearPendingTemplateShare();
    if (isAuthenticated) navigate(createPageUrl('Templates'), { replace: true });
    else navigate('/', { replace: true });
  };

  if (!route) {
    return <main className="min-h-dvh bg-[#F7F9FC] px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><div className="mx-auto max-w-lg"><StateView state="error" title="Este enlace ya no está disponible" description="Puede haber vencido o la persona que lo creó pudo desactivarlo." actionLabel="Volver" onAction={leave} /></div></main>;
  }
  if (isLoadingAuth) {
    return <main className="min-h-dvh bg-[#F7F9FC] px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Preparando las plantillas" /></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-dvh items-center bg-[#F7F9FC] px-5 py-10">
        <section className="mx-auto w-full max-w-lg rounded-3xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
          <BrandMark className="mx-auto h-16 w-16 rounded-2xl" />
          <p className="mt-5 text-[15px] font-bold uppercase tracking-wide text-[#004AFE]">Plantillas compartidas</p>
          <h1 className="mt-2 text-2xl font-bold text-[#0F172A]">Inicia sesión para revisarlas</h1>
          <p className="mt-2 text-[16px] leading-7 text-[#64748B]">Verás una vista previa antes de decidir si quieres importar las copias a tu cuenta.</p>
          <Link to={`/iniciar-sesion?returnTo=${encodeURIComponent(route)}`} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#004AFE] px-5 text-[17px] font-bold text-white"><LogIn className="h-5 w-5" /> Iniciar sesión</Link>
          <button type="button" onClick={leave} className="mt-2 min-h-12 w-full rounded-xl text-[16px] font-semibold text-[#475569]">Cancelar</button>
        </section>
      </main>
    );
  }

  if (previewQuery.isPending) {
    return <main className="min-h-dvh bg-[#F7F9FC] px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Preparando las plantillas" /></main>;
  }
  if (previewQuery.isError || !previewQuery.data) {
    return <main className="min-h-dvh bg-[#F7F9FC] px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><div className="mx-auto max-w-lg"><StateView state="error" title="Este enlace ya no está disponible" description="Puede haber vencido o la persona que lo creó pudo desactivarlo." actionLabel="Volver" onAction={leave} /></div></main>;
  }

  const templates = previewQuery.data.templates || [];
  if (importMutation.isSuccess) {
    return (
      <main className="flex min-h-dvh items-center bg-[#F7F9FC] px-5 py-10">
        <section className="mx-auto w-full max-w-lg rounded-3xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-8 w-8" /></span>
          <h1 className="mt-5 text-2xl font-bold text-[#0F172A]">{importMutation.data.created ? 'Plantillas importadas' : 'Ya habías importado estas plantillas'}</h1>
          <p className="mt-2 text-[16px] leading-7 text-[#64748B]">Encontrarás {importMutation.data.imported_count} plantilla{importMutation.data.imported_count === 1 ? '' : 's'} en tu lista. Ninguna reemplazó tus mensajes actuales.</p>
          <button type="button" onClick={() => navigate(createPageUrl('Templates'), { replace: true })} className="mt-6 min-h-14 w-full rounded-2xl bg-[#004AFE] px-5 text-[17px] font-bold text-white">Ver mis plantillas</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="border-b border-[#E2E8F0] bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={leave} className="flex min-h-12 items-center gap-2 rounded-xl pr-3 text-[17px] font-semibold"><ArrowLeft className="h-6 w-6" /> Volver</button>
      </header>
      <section className="mx-auto max-w-lg px-5 py-6">
        <BrandMark className="h-16 w-16 rounded-2xl" />
        <p className="mt-5 text-[15px] font-bold uppercase tracking-wide text-[#004AFE]">Plantillas compartidas</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0F172A]">¿Quieres agregarlas a tu cuenta?</h1>
        <p className="mt-2 text-[16px] leading-7 text-[#64748B]">Se crearán copias privadas. No cambiaremos tus mensajes predeterminados ni compartiremos contactos.</p>

        <div className="mt-6 space-y-3">
          {templates.map((template, index) => (
            <article key={`${template.name}-${index}`} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <span className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[15px] font-semibold text-[#475569]">{template.category_name || templateSituationLabel(template.situation)}</span>
              <h2 className="mt-3 text-[17px] font-bold text-[#0F172A]">{template.name}</h2>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[15px] leading-6 text-[#64748B]">{template.content}</p>
            </article>
          ))}
        </div>

        <p className="mt-5 text-[15px] text-[#64748B]">El enlace vence {new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(previewQuery.data.expires_at))}.</p>

        <button type="button" disabled={importMutation.isPending} onClick={() => importMutation.mutate()} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#004AFE] px-5 text-[17px] font-bold text-white disabled:opacity-50"><Download className="h-5 w-5" /> {importMutation.isPending ? 'Importando…' : `Importar ${templates.length} plantilla${templates.length === 1 ? '' : 's'}`}</button>
        {importMutation.isError && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-[15px] leading-6 text-red-700" role="alert">No pudimos importarlas. Tu cuenta no cambió; intenta de nuevo.</p>}
      </section>
    </main>
  );
}
