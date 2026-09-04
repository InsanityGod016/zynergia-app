import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Grip, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StateView from '@/components/ui/StateView';
import { useAuth } from '@/lib/AuthContext';
import {
  navigateBack,
  prepareBackgroundImage,
  QR_POSITIONS,
  QR_SIZES,
  resolveQrPlacement,
} from '@/lib/qr-tools';
import { useQrDraft } from '@/lib/useQrDraft';
import { createPageUrl } from '@/utils';

export default function AddImageToQR() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, updateDraft] = useQrDraft(user?.id);
  const [status, setStatus] = useState(() => draft.backgroundImage ? 'ready' : 'idle');
  const [error, setError] = useState('');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !draft.backgroundImage) return undefined;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      setViewport(current => current.width === rect.width && current.height === rect.height
        ? current
        : { width: rect.width, height: rect.height });
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [draft.backgroundImage]);

  const placement = resolveQrPlacement(draft.placement, viewport.width, viewport.height);

  const saveChange = (change) => {
    const persisted = updateDraft(change);
    setError(persisted ? '' : 'No pudimos guardar el borrador. Libera espacio e intenta de nuevo.');
    return persisted;
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const previousDraft = draft;
    setStatus('loading');
    setError('');
    try {
      const image = await prepareBackgroundImage(file);
      const persisted = updateDraft(current => ({
        ...current,
        backgroundImage: image.dataUrl,
        imageAspectRatio: image.aspectRatio,
        placement: { preset: 'bottom-left', size: 0.27, x: 0, y: 0 },
      }));
      if (!persisted) {
        updateDraft(() => previousDraft, { persist: false });
        throw new Error('No pudimos guardar el borrador. Elige una imagen más ligera.');
      }
      setStatus('ready');
    } catch (uploadError) {
      setError(uploadError.message || 'No pudimos preparar esta imagen.');
      setStatus(previousDraft.backgroundImage ? 'ready' : 'error');
    }
  };

  const handlePointerDown = (event) => {
    if (!containerRef.current || !viewport.width) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left - placement.x,
      offsetY: event.clientY - rect.top - placement.y,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !container) return;
    event.preventDefault();
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left - drag.offsetX, rect.width - placement.size));
    const y = Math.max(0, Math.min(event.clientY - rect.top - drag.offsetY, rect.height - placement.size));
    updateDraft(current => ({
      ...current,
      placement: { ...current.placement, preset: 'manual', x: x / rect.width, y: y / rect.height },
    }), { persist: false });
  };

  const finishDrag = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    saveChange(current => current);
  };

  if (!draft.qrDataUrl) {
    return (
      <div className="min-h-screen bg-background p-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <StateView
          state="error"
          title="Primero crea tu código QR"
          description="No encontramos un QR guardado. Tu enlace no se perdió si ya lo escribiste."
          actionLabel="Volver al generador"
          onAction={() => navigate(createPageUrl('QRGenerator'), { replace: true })}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" tabIndex={-1} />

      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          onClick={() => navigateBack(navigate, createPageUrl('QRGenerator'))}
          className="flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Volver al código QR"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="ml-2 text-xl font-bold">Poner QR en una imagen</h1>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {status === 'loading' && (
          <StateView state="loading" title="Preparando tu imagen" description="Todo ocurre dentro de este dispositivo." />
        )}

        {status === 'error' && (
          <StateView state="error" title="No pudimos usar esa imagen" description={error} actionLabel="Elegir otra imagen" onAction={() => fileInputRef.current?.click()} />
        )}

        {status === 'idle' && (
          <section className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-7 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <ImagePlus className="h-9 w-9" aria-hidden="true" />
            </span>
            <h2 className="mt-6 text-2xl font-bold">Elige una imagen</h2>
            <p className="mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">Puede ser una foto o volante. La imagen se prepara aquí y no se sube a ningún servidor.</p>
            <Button type="button" size="lg" className="mt-7 w-full max-w-sm" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus aria-hidden="true" /> Elegir imagen
            </Button>
          </section>
        )}

        {status === 'ready' && draft.backgroundImage && (
          <>
            <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex justify-center overflow-hidden rounded-2xl bg-muted">
                <div
                  ref={containerRef}
                  className="relative max-h-[52vh] overflow-hidden"
                  style={{
                    aspectRatio: draft.imageAspectRatio,
                    width: `min(100%, calc(52vh * ${draft.imageAspectRatio}))`,
                  }}
                >
                  <img src={draft.backgroundImage} alt="Imagen elegida" className="h-full w-full select-none object-cover" draggable={false} />
                  {placement.size > 0 && (
                    <div
                      className="absolute cursor-move touch-none rounded-lg bg-white p-1 shadow-xl ring-2 ring-primary focus-visible:outline-none focus-visible:ring-4"
                      style={{ left: placement.x, top: placement.y, width: placement.size, height: placement.size }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={finishDrag}
                      tabIndex={0}
                      aria-label="Código QR. Puedes arrastrarlo; también puedes usar las posiciones de abajo."
                    >
                      <img src={draft.qrDataUrl} alt="" className="h-full w-full pointer-events-none" draggable={false} />
                      <span className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow" aria-hidden="true">
                        <Grip className="h-4 w-4" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-[15px] text-muted-foreground">Puedes arrastrar el QR o elegir una posición.</p>
            </section>

            <fieldset className="mt-6">
              <legend className="text-[17px] font-bold">Posición del QR</legend>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {QR_POSITIONS.map(position => (
                  <button
                    key={position.id}
                    type="button"
                    aria-pressed={draft.placement.preset === position.id}
                    onClick={() => saveChange(current => ({ ...current, placement: { ...current.placement, preset: position.id } }))}
                    className={`min-h-14 rounded-2xl border px-3 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${draft.placement.preset === position.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}
                  >
                    {position.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-[17px] font-bold">Tamaño del QR</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {QR_SIZES.map(size => (
                  <button
                    key={size.id}
                    type="button"
                    aria-pressed={Math.abs(draft.placement.size - size.ratio) < 0.001}
                    onClick={() => saveChange(current => ({ ...current, placement: { ...current.placement, size: size.ratio } }))}
                    className={`min-h-12 rounded-2xl border px-2 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${Math.abs(draft.placement.size - size.ratio) < 0.001 ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="mt-4 text-[15px] font-medium text-destructive" role="alert">{error}</p>}

            <Button type="button" variant="outline" className="mt-6 w-full" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus aria-hidden="true" /> Elegir otra imagen
            </Button>
            <Button type="button" size="lg" className="mt-3 w-full justify-between" onClick={() => navigate(createPageUrl('PreviewQR'))}>
              Ver resultado <Check aria-hidden="true" />
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
