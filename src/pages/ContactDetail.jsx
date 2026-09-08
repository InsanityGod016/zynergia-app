import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Pencil, Phone } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/api/db';
import { supabase } from '@/lib/supabaseClient';
import { whatsappUrl } from '@/lib/phone';
import { createPageUrl } from '@/utils';
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

const typeLabels = {
  cliente_producto: 'Cliente',
  partner: 'Socio',
  prospecto_producto: 'Prospecto de producto',
  prospecto_partner: 'Prospecto de negocio',
};

function parseLocalDate(value) {
  const [year, month, day] = String(value ?? '').split('-').map(Number);
  if (!year || !month || !day) return new Date(Number.NaN);
  return new Date(year, month - 1, day);
}

function localDateTimestamp(value) {
  const timestamp = parseLocalDate(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function formatLocalDate(value, pattern) {
  const date = parseLocalDate(value);
  return Number.isFinite(date.getTime())
    ? format(date, pattern, { locale: es })
    : 'Fecha no disponible';
}

function DetailState(/** @type {{ title: string, description: string, actionLabel?: string, onAction?: () => unknown, onBack: () => void }} */ {
  title,
  description,
  actionLabel,
  onAction,
  onBack,
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5">
        <BackButton onClick={onBack} />
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

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 items-center gap-2 rounded-2xl pr-3 text-[17px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="Volver a contactos"
    >
      <span className="flex h-12 w-12 items-center justify-center">
        <ArrowLeft aria-hidden="true" className="h-6 w-6" />
      </span>
      Volver
    </button>
  );
}

export default function ContactDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('id');
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const goBack = () => {
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate(createPageUrl('Contacts'), { replace: true });
  };

  const contactQuery = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => db.Contact.filter({ id: contactId }),
    select: (data) => data[0],
    enabled: Boolean(contactId),
  });
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: () => db.Tag.list() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const salesQuery = useQuery({
    queryKey: ['sales', contactId],
    queryFn: () => db.Sale.filter({ contact_id: contactId }),
    enabled: Boolean(contactId),
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', contactId],
    queryFn: () => db.Task.filter({ contact_id: contactId }),
    enabled: Boolean(contactId),
  });

  const contact = contactQuery.data;
  const tags = tagsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const sales = salesQuery.data ?? [];

  const cancelMutation = useMutation({
    mutationFn: async (saleId) => {
      const { error } = await supabase.rpc('stop_sale_follow_up', { p_sale_id: saleId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', contactId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', contactId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setCancelSaleId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => db.Contact.anonymize(contactId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
      ]);
      navigate(createPageUrl('Contacts'), { replace: true });
    },
  });

  const selectedTags = useMemo(
    () => tags.filter((tag) => (contact?.tag_ids ?? []).includes(tag.id)),
    [contact?.tag_ids, tags],
  );
  const sortedSales = useMemo(
    () => [...sales].sort((a, b) => localDateTimestamp(b.purchase_date) - localDateTimestamp(a.purchase_date)),
    [sales],
  );
  const activeProducts = useMemo(() => {
    const activeSales = sales.filter((sale) => sale.status === 'active' && !sale.follow_up_stopped_at);
    return [...new Set(activeSales.map((sale) => sale.product_id))].flatMap((productId) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return [];
      const productSales = activeSales
        .filter((sale) => sale.product_id === productId)
        .sort((a, b) => localDateTimestamp(b.purchase_date) - localDateTimestamp(a.purchase_date));
      return [{ product, sales: productSales, latestSale: productSales[0], units: productSales.reduce((total, sale) => total + (Number(sale.quantity) || 1), 0) }];
    });
  }, [products, sales]);

  if (!contactId) {
    return <DetailState title="No encontramos este contacto" description="El enlace está incompleto." actionLabel="Volver a contactos" onAction={() => navigate(createPageUrl('Contacts'), { replace: true })} onBack={goBack} />;
  }
  if (contactQuery.isPending) {
    return <DetailState title="Cargando contacto" description="Esto sólo tomará un momento." onBack={goBack} />;
  }
  if (contactQuery.isError) {
    return <DetailState title="No pudimos abrir el contacto" description="Revisa tu conexión. Tus datos siguen seguros." actionLabel="Intentar de nuevo" onAction={() => contactQuery.refetch()} onBack={goBack} />;
  }
  if (!contact) {
    return <DetailState title="Contacto no disponible" description="Puede que haya sido eliminado o que este enlace ya no funcione." actionLabel="Volver a contactos" onAction={() => navigate(createPageUrl('Contacts'), { replace: true })} onBack={goBack} />;
  }

  const verifiedPhone = contact.phone_e164 || contact.phone || '';
  const phoneDigits = String(verifiedPhone).replace(/\D/g, '');
  const phoneForCall = String(verifiedPhone).trim().startsWith('+') ? `+${phoneDigits}` : phoneDigits;
  const whatsappLink = whatsappUrl(verifiedPhone);
  const hasPhone = Boolean(whatsappLink);
  const relatedDataError = tagsQuery.isError || productsQuery.isError || salesQuery.isError || tasksQuery.isError;

  return (
    <div className="min-h-screen bg-background pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur sm:px-5">
        <BackButton onClick={goBack} />
      </header>

      <main className="space-y-6 px-4 py-5 sm:px-5">
        <section aria-labelledby="contact-name">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 id="contact-name" className="break-words text-3xl font-bold leading-tight text-foreground">
                {contact.full_name || 'Contacto eliminado'}
              </h1>
              <p className="mt-1 text-[17px] text-muted-foreground">
                {typeLabels[contact.contact_type] || 'Sin tipo asignado'}
              </p>
            </div>
            <Link
              to={createPageUrl(`EditContact?id=${contactId}`)}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Pencil aria-hidden="true" className="h-5 w-5" />
              Editar
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3" aria-label="Acciones de contacto">
          <a
            href={hasPhone ? `tel:${phoneForCall || phoneDigits}` : undefined}
            aria-disabled={!hasPhone}
            onClick={(event) => { if (!hasPhone) event.preventDefault(); }}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              hasPhone ? 'bg-primary text-primary-foreground' : 'cursor-not-allowed bg-muted text-muted-foreground'
            }`}
          >
            <Phone aria-hidden="true" className="h-5 w-5" />
            Llamar
          </a>
          <button
            type="button"
            disabled={!hasPhone}
            onClick={() => window.open(whatsappLink, '_blank', 'noopener,noreferrer')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-primary bg-card text-[17px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
          >
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
            WhatsApp
          </button>
        </section>
        {!hasPhone && <p className="-mt-3 text-[15px] text-muted-foreground">Agrega un teléfono para llamar o enviar un mensaje.</p>}

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm" aria-labelledby="contact-info-title">
          <h2 id="contact-info-title" className="text-xl font-semibold text-foreground">Información</h2>
          <dl className="mt-4 space-y-4 text-[17px]">
            <div>
              <dt className="text-[15px] font-semibold text-muted-foreground">Teléfono</dt>
              <dd className="mt-1 break-words text-foreground">{contact.phone || 'Sin teléfono'}</dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-muted-foreground">Etiquetas</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {selectedTags.length ? selectedTags.map((tag) => (
                  <span key={tag.id} className="rounded-xl bg-primary/10 px-3 py-2 text-[15px] font-medium text-primary">{tag.name}</span>
                )) : <span className="text-foreground">Sin etiquetas</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-muted-foreground">Notas</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">{contact.notes || 'Sin notas'}</dd>
            </div>
          </dl>
        </section>

        {relatedDataError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
            <p className="text-[15px] text-foreground">No pudimos cargar toda la información de este contacto.</p>
            <button
              type="button"
              onClick={() => Promise.all([tagsQuery.refetch(), productsQuery.refetch(), salesQuery.refetch(), tasksQuery.refetch()])}
              className="mt-2 min-h-12 rounded-xl px-3 text-[15px] font-semibold text-primary"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {!relatedDataError && (
          <section aria-labelledby="products-title">
            <h2 id="products-title" className="text-xl font-semibold text-foreground">Productos activos</h2>
            <div className="mt-3 space-y-3">
              {activeProducts.map(({ product, sales: productSales, latestSale, units }) => (
                <article key={product.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-[17px] font-semibold text-foreground">{product.name}</h3>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    {units} unidad{units === 1 ? '' : 'es'} en {productSales.length} compra{productSales.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    Última: {formatLocalDate(latestSale.purchase_date, "d 'de' MMMM 'de' yyyy")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCancelSaleId(latestSale.id)}
                    disabled={tasksQuery.isLoading || tasksQuery.isFetching}
                    className="mt-3 min-h-12 rounded-xl px-3 text-left text-[15px] font-semibold text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
                  >
                    {tasksQuery.isLoading || tasksQuery.isFetching ? 'Preparando seguimiento…' : 'Detener seguimiento de recompra'}
                  </button>
                </article>
              ))}
              {!activeProducts.length && <p className="rounded-2xl bg-muted p-4 text-[15px] text-muted-foreground">No hay productos activos.</p>}
            </div>
          </section>
        )}

        {!relatedDataError && (
          <section aria-labelledby="sales-title">
            <h2 id="sales-title" className="text-xl font-semibold text-foreground">Historial de compras</h2>
            <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              {sortedSales.map((sale) => {
                const product = products.find((item) => item.id === sale.product_id);
                return (
                  <div key={sale.id} className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-medium text-foreground">{Number(sale.quantity) || 1} × {product?.name || 'Producto'}</p>
                      <p className="text-[15px] text-muted-foreground">{formatLocalDate(sale.purchase_date, 'd MMM yyyy')}</p>
                    </div>
                    {sale.status === 'cancelled' && !sale.follow_up_stopped_at && <span className="text-[15px] font-medium text-destructive">Cancelado</span>}
                  </div>
                );
              })}
              {!sortedSales.length && <p className="p-4 text-[15px] text-muted-foreground">No hay compras registradas.</p>}
            </div>
          </section>
        )}

        <section className="border-t border-border pt-4" aria-labelledby="delete-title">
          <h2 id="delete-title" className="text-[17px] font-semibold text-foreground">Administrar contacto</h2>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="mt-2 min-h-12 rounded-xl px-3 text-left text-[17px] font-semibold text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            Eliminar contacto
          </button>
          {deleteMutation.isError && (
            <p className="mt-2 text-[15px] text-destructive" role="alert">No pudimos eliminar el contacto. Tus datos no cambiaron. Intenta de nuevo.</p>
          )}
        </section>
      </main>

      <AlertDialog open={Boolean(cancelSaleId)} onOpenChange={(open) => { if (!open && !cancelMutation.isPending) setCancelSaleId(null); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Detener este seguimiento?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">El producto seguirá en el historial y cancelaremos sus recordatorios de recompra pendientes.</AlertDialogDescription>
          </AlertDialogHeader>
          {cancelMutation.isError && <p className="text-[15px] text-destructive" role="alert">No pudimos guardar el cambio. Intenta de nuevo.</p>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-12 text-[15px]">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                cancelMutation.mutate(cancelSaleId);
              }}
              disabled={cancelMutation.isPending}
              className="min-h-12 bg-destructive text-[15px] text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? 'Guardando…' : 'Sí, detener'}
            </AlertDialogAction>
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
