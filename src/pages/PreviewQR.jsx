import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StateView from '@/components/ui/StateView';
import { useAuth } from '@/lib/AuthContext';
import {
  composeQrImage,
  downloadDataUrl,
  navigateBack,
  shareOrDownload,
} from '@/lib/qr-tools';
import { useQrDraft } from '@/lib/useQrDraft';
import { createPageUrl } from '@/utils';

export default function PreviewQR() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft] = useQrDraft(user?.id);
  const [status, setStatus] = useState('loading');
  const [composedImage, setComposedImage] = useState('');
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!draft.backgroundImage || !draft.qrDataUrl) {
      setStatus('missing');
      return () => { cancelled = true; };
    }

    setStatus('loading');
    setError('');
    composeQrImage(draft).then(
      image => {
        if (cancelled) return;
        setComposedImage(image);
        setStatus('ready');
      },
      () => {
        if (cancelled) return;
        setError('No pudimos preparar la imagen final. Tu borrador sigue guardado.');
        setStatus('error');
      },
    );
    return () => { cancelled = true; };
  }, [draft.backgroundImage, draft.imageAspectRatio, draft.placement, draft.qrDataUrl, revision]);

  const download = async () => {
    setActionError('');
    try {
      await downloadDataUrl(composedImage, 'imagen-con-qr.png');
      setActionMessage('Imagen descargada.');
    } catch {
      setActionError('No pudimos descargar la imagen. Intenta de nuevo.');
    }
  };

  const share = async () => {
    setActionError('');
    try {
      const result = await shareOrDownload(composedImage, 'imagen-con-qr.png', 'Imagen con código QR');
      if (result === 'shared') setActionMessage('Imagen compartida.');
      if (result === 'downloaded') setActionMessage('Tu dispositivo no permite compartir archivos. Descargamos la imagen.');
    } catch {
      setActionError('No pudimos compartir ni descargar la imagen. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          onClick={() => navigateBack(navigate, createPageUrl('AddImageToQR'))}
          className="flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Volver a editar la imagen"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="ml-2 text-xl font-bold">Resultado</h1>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {status === 'missing' && (
          <StateView
            state="error"
            title="Falta preparar la imagen"
            description="No encontramos una imagen con QR guardada en este dispositivo."
            actionLabel="Volver a elegir imagen"
            onAction={() => navigate(createPageUrl('AddImageToQR'), { replace: true })}
          />
        )}

        {status === 'loading' && (
          <StateView state="loading" title="Preparando el resultado" description="Un momento. Todo ocurre dentro de este dispositivo." />
        )}

        {status === 'error' && (
          <StateView state="error" title="No pudimos preparar el resultado" description={error} actionLabel="Intentar de nuevo" onAction={() => setRevision(value => value + 1)} />
        )}

        {status === 'ready' && composedImage && (
          <>
            <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <img src={composedImage} alt="Imagen final con código QR" className="mx-auto max-h-[58vh] w-auto max-w-full rounded-2xl" />
            </section>

            <p className="mt-4 text-center text-base leading-relaxed text-muted-foreground">Revisa que el QR no cubra información importante.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="h-12" onClick={download}>
                <Download aria-hidden="true" /> Descargar
              </Button>
              <Button type="button" variant="outline" className="h-12" onClick={share}>
                <Share2 aria-hidden="true" /> Compartir
              </Button>
            </div>

            {(actionMessage || actionError) && (
              <p className={`mt-4 text-center text-[15px] ${actionError ? 'text-destructive' : 'text-muted-foreground'}`} role={actionError ? 'alert' : 'status'}>
                {actionError || actionMessage}
              </p>
            )}

            <Button type="button" variant="outline" className="mt-6 w-full" onClick={() => navigate(createPageUrl('AddImageToQR'))}>
              Editar posición o tamaño
            </Button>
            <Button type="button" size="lg" className="mt-3 w-full justify-between" onClick={() => navigate(createPageUrl('More'))}>
              Listo <Check aria-hidden="true" />
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
