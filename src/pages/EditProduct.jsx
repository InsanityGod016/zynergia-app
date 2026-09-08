import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, Camera as CameraIcon, Copy, Images, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { compressProductImage } from '@/lib/productImage';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createPageUrl } from '@/utils';

const EMPTY_PRODUCT = {
  name: '', category: 'Compra Única', subcategory: '', image_url: '', image_path: null, link_url: '', cycle_days: 30, repurchase_enabled: true,
};

function validOptionalUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function ProductForm({ product, isNew, returnTo }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(product);
  const [showArchive, setShowArchive] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);

  const initial = useMemo(() => JSON.stringify(product), [product]);
  const dirty = JSON.stringify(form) !== initial || Boolean(pendingImage) || removeImage;
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const setImageBlob = async (blob) => {
    setImageLoading(true);
    setError('');
    try {
      const compressed = await compressProductImage(blob);
      setPendingImage(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      setRemoveImage(false);
      setShowImagePicker(false);
    } catch (imageError) {
      setError(imageError?.message || 'No pudimos preparar esa imagen. Elige otra.');
    } finally {
      setImageLoading(false);
    }
  };

  const readNativeImage = async (source) => {
    setImageLoading(true);
    setError('');
    try {
      const media = source === 'camera'
        ? await Camera.takePhoto({ quality: 85, targetWidth: 1600, targetHeight: 1600, correctOrientation: true, saveToGallery: false, editable: 'no' })
        : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false, limit: 1, quality: 85, targetWidth: 1600, targetHeight: 1600, correctOrientation: true })).results[0];
      if (!media) return;
      const sourceUrl = media.webPath || (media.thumbnail ? `data:image/jpeg;base64,${media.thumbnail}` : '');
      if (!sourceUrl) throw new Error('No pudimos leer la foto seleccionada.');
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error('No pudimos leer la foto seleccionada.');
      await setImageBlob(await response.blob());
    } catch (imageError) {
      if (!['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0013'].includes(imageError?.code)) {
        setError(imageError?.message || 'No pudimos abrir tus fotos. Revisa el permiso e intenta de nuevo.');
      }
    } finally {
      setImageLoading(false);
    }
  };

  const chooseImage = (source) => {
    if (Capacitor.isNativePlatform()) {
      void readNativeImage(source);
      return;
    }
    setShowImagePicker(false);
    (source === 'camera' ? cameraInput : galleryInput).current?.click();
  };

  const clearImage = () => {
    setPendingImage(null);
    setPreviewUrl('');
    setRemoveImage(Boolean(product.image_path || (product.origin === 'user' && product.image_url)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setError('');
      const name = form.name.trim();
      const subcategory = form.subcategory.trim();
      const link_url = form.link_url.trim();
      const repurchase_enabled = form.repurchase_enabled !== false;
      const cycle_days = repurchase_enabled ? Number(form.cycle_days) : 0;
      if (!name) throw new Error('Escribe el nombre del producto.');
      if (!subcategory) throw new Error('Escribe la categoría del producto.');
      if (!validOptionalUrl(link_url)) throw new Error('Revisa el enlace de compra. Debe empezar con https://');
      if (repurchase_enabled && (!Number.isInteger(cycle_days) || cycle_days < 1 || cycle_days > 730)) throw new Error('El ciclo debe ser de 1 a 730 días.');
      const productId = isNew ? db.Product.newId() : product.id;
      let uploadedPath = '';
      try {
        if (pendingImage) uploadedPath = await db.Product.uploadImage(pendingImage);
        const payload = {
          name,
          category: form.category,
          subcategory,
          link_url,
          cycle_days,
          frequency_months: Math.max(1, Math.round((cycle_days || 30) / 30)),
          repurchase_enabled,
          ...(uploadedPath || removeImage
            ? { image_path: uploadedPath || null, image_url: null }
            : {}),
        };
        const changed = Object.fromEntries(Object.entries(payload).filter(([key, value]) => value !== product[key]));
        const saved = isNew
          ? await db.Product.create({ ...payload, id: productId })
          : Object.keys(changed).length
            ? await db.Product.update(productId, changed)
            : product;
        if ((uploadedPath || removeImage) && product.image_path && product.image_path !== uploadedPath) {
          void db.Product.deleteImage(product.image_path).catch(() => {});
        }
        return saved;
      } catch (saveError) {
        if (uploadedPath) await db.Product.deleteImage(uploadedPath).catch(() => {});
        throw saveError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isNew ? 'Producto creado.' : 'Producto guardado.');
      navigate(returnTo || createPageUrl('Products'), { replace: true });
    },
    onError: mutationError => setError(mutationError.message || 'No pudimos guardar. Tus datos siguen aquí.'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => db.Product.archive(product.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto archivado.');
      navigate(createPageUrl('Products'), { replace: true });
    },
    onError: mutationError => { setShowArchive(false); setError(mutationError.message || 'No pudimos archivar el producto.'); },
  });

  const goBack = useCallback(() => {
    if (!dirty || window.confirm('¿Salir sin guardar los cambios?')) navigate(returnTo || createPageUrl('Products'));
  }, [dirty, navigate, returnTo]);

  useEffect(() => {
    const warnBeforeUnload = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('zynergia:dirty-state', { detail: { dirty } }));
  }, [dirty]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent('zynergia:dirty-state', { detail: { dirty: false } }));
  }, []);

  useEffect(() => {
    window.addEventListener('zynergia:request-back', goBack);
    return () => window.removeEventListener('zynergia:request-back', goBack);
  }, [goBack]);

  const copyLink = async () => {
    if (!form.link_url.trim()) return;
    try { await navigator.clipboard.writeText(form.link_url.trim()); toast.success('Enlace copiado.'); }
    catch { toast.error('No pudimos copiar el enlace.'); }
  };

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-32">
      <header className="sticky top-0 z-20 flex items-center border-b border-[#E2E8F0] bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button type="button" onClick={goBack} className="flex min-h-12 items-center gap-1 rounded-xl pr-3 text-[17px] font-semibold">
          <span className="flex h-12 w-10 items-center justify-center"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></span> Volver
        </button>
      </header>

      <section className="mx-auto max-w-xl px-5 py-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{isNew ? 'Nuevo producto' : 'Editar producto'}</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Los mensajes usarán automáticamente el nombre y el enlace que guardes aquí.</p>

        <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowImagePicker(true)}
              disabled={imageLoading}
              aria-label={(previewUrl || form.image_path || form.image_url) ? 'Cambiar foto del producto' : 'Agregar foto del producto'}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F1F5F9] outline-none ring-[#004AFE] transition focus-visible:ring-2 disabled:opacity-50"
            >
              {(previewUrl || (!removeImage && form.image_url))
                ? <img src={previewUrl || form.image_url} alt={`Vista previa de ${form.name || 'producto'}`} className="h-full w-full object-contain" />
                : <span className="text-3xl font-bold text-[#004AFE]">{form.name?.charAt(0) || 'P'}</span>}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold text-[#0F172A]">Foto del producto</p>
              <p className="mt-1 text-[15px] leading-5 text-[#64748B]">Toma una foto o elige una de tu galería.</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setShowImagePicker(true)} disabled={imageLoading} className="min-h-12 rounded-xl bg-[#EAF0FF] px-3 text-[15px] font-semibold text-[#004AFE] disabled:opacity-50">{imageLoading ? 'Preparando…' : (previewUrl || form.image_path || (form.origin === 'user' && form.image_url && !removeImage)) ? 'Cambiar foto' : 'Agregar foto'}</button>
            {(pendingImage || form.image_path || (form.origin === 'user' && form.image_url && !removeImage)) ? <button type="button" onClick={clearImage} disabled={imageLoading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-[15px] font-semibold text-red-700"><Trash2 className="h-5 w-5" aria-hidden="true" /> Quitar</button> : <div />}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block text-[16px] font-semibold text-[#0F172A]">Nombre
            <Input value={form.name} onChange={event => update('name', event.target.value)} className="mt-2 h-14 rounded-2xl bg-white text-[17px]" placeholder="Ej. BalanceOil+" autoComplete="off" />
          </label>
          <label className="block text-[16px] font-semibold text-[#0F172A]">Tipo
            <select value={form.category} onChange={event => update('category', event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px] shadow-sm">
              <option>Premier Kits</option><option>Compra Única</option>
            </select>
          </label>
          <label className="block text-[16px] font-semibold text-[#0F172A]">Categoría
            <Input value={form.subcategory} onChange={event => update('subcategory', event.target.value)} className="mt-2 h-14 rounded-2xl bg-white text-[17px]" placeholder="Ej. SANKI" autoComplete="off" />
          </label>
          <label className="block text-[16px] font-semibold text-[#0F172A]">Enlace de compra
            <div className="mt-2 flex gap-2">
              <Input value={form.link_url} onChange={event => update('link_url', event.target.value)} className="h-14 rounded-2xl bg-white text-[17px]" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://..." />
              <button type="button" disabled={!form.link_url.trim()} onClick={copyLink} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D7E1F0] bg-white text-[#004AFE] disabled:opacity-40" aria-label="Copiar enlace"><Copy className="h-5 w-5" /></button>
            </div>
          </label>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <label className="flex min-h-12 items-center justify-between gap-4 text-[16px] font-semibold text-[#0F172A]">
              Crear recordatorios de recompra
              <input type="checkbox" checked={form.repurchase_enabled !== false} onChange={event => update('repurchase_enabled', event.target.checked)} className="h-6 w-6 accent-[#004AFE]" />
            </label>
            {form.repurchase_enabled !== false && <label className="mt-4 block text-[15px] font-semibold text-[#334155]">¿Cuántos días dura?
              <Input value={form.cycle_days} onChange={event => update('cycle_days', event.target.value)} type="number" inputMode="numeric" min="1" max="730" className="mt-2 h-14 rounded-2xl text-[17px]" />
            </label>}
          </div>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert"><p className="font-bold text-red-700">No pudimos guardar</p><p className="mt-1 text-[15px] leading-6 text-red-700">{error} Tus datos siguen aquí.</p></div>}

        {!isNew && <button type="button" onClick={() => setShowArchive(true)} className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-[16px] font-semibold text-red-700"><Archive className="h-5 w-5" /> Archivar producto</button>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E2E8F0] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <Button type="button" size="lg" className="w-full" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? 'Guardando…' : isNew ? 'Crear producto' : 'Guardar cambios'}</Button>
      </div>

      <AlertDialog open={showArchive} onOpenChange={setShowArchive}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl">
          <AlertDialogHeader><AlertDialogTitle className="text-xl">¿Archivar este producto?</AlertDialogTitle><AlertDialogDescription className="text-[15px] leading-6">Dejará de aparecer al registrar ventas. Tus ventas anteriores no se borrarán.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="min-h-12 text-[15px]">Conservar producto</AlertDialogCancel><AlertDialogAction onClick={() => archiveMutation.mutate()} className="min-h-12 bg-red-600 text-[15px] hover:bg-red-700">{archiveMutation.isPending ? 'Archivando…' : 'Archivar'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={showImagePicker} onOpenChange={setShowImagePicker}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <SheetHeader className="pr-12 text-left">
            <SheetTitle className="text-xl">Agregar foto</SheetTitle>
            <SheetDescription className="text-[15px]">Elige de dónde quieres tomar la imagen del producto.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <button type="button" onClick={() => chooseImage('camera')} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-muted px-4 text-[17px] font-semibold text-foreground"><CameraIcon className="h-6 w-6 text-primary" aria-hidden="true" /> Tomar foto</button>
            <button type="button" onClick={() => chooseImage('photos')} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-muted px-4 text-[17px] font-semibold text-foreground"><Images className="h-6 w-6 text-primary" aria-hidden="true" /> Elegir de fototeca</button>
            <SheetClose asChild>
              <button type="button" className="min-h-12 w-full rounded-2xl px-4 text-[16px] font-semibold text-muted-foreground">Cancelar</button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void setImageBlob(file); event.target.value = ''; }} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void setImageBlob(file); event.target.value = ''; }} />
    </main>
  );
}

export default function EditProduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const productId = searchParams.get('id');
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const returnTo = /^\/SelectMessageTone\?taskId=[a-zA-Z0-9_-]{1,100}$/.test(requestedReturnTo)
    ? requestedReturnTo
    : '';
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list(), enabled: !isNew });
  const foundProduct = productsQuery.data?.find(item => item.id === productId);
  const product = isNew ? EMPTY_PRODUCT : foundProduct ? {
    ...foundProduct,
    cycle_days: Number(foundProduct.cycle_days) > 0 ? Number(foundProduct.cycle_days) : Number(foundProduct.frequency_months || 1) * 30,
    repurchase_enabled: foundProduct.repurchase_enabled !== false && Number(foundProduct.cycle_days) !== 0,
  } : null;

  if (!isNew && productsQuery.isPending) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Cargando producto" /></main>;
  if (!isNew && productsQuery.isError) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="No pudimos abrir el producto" actionLabel="Intentar de nuevo" onAction={() => productsQuery.refetch()} /></main>;
  if (!product) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="empty" title="Producto no disponible" actionLabel="Volver a productos" onAction={() => navigate(createPageUrl('Products'), { replace: true })} /></main>;
  return <ProductForm key={product.id || 'new'} product={product} isNew={isNew} returnTo={returnTo} />;
}
