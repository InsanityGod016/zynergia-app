import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, LoaderCircle, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import {
  downloadDataUrl,
  generateQrDataUrl,
  navigateBack,
  QR_STYLES,
  shareOrDownload,
  validateHttpUrl,
} from '@/lib/qr-tools';
import { useQrDraft } from '@/lib/useQrDraft';
import { createPageUrl } from '@/utils';

export default function QRGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, updateDraft] = useQrDraft(user?.id);
  const [status, setStatus] = useState(() => draft.qrDataUrl ? 'ready' : 'idle');
  const [fieldError, setFieldError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const generationId = useRef(0);

  const generate = async (urlValue = draft.url, style = draft.style) => {
    const validation = validateHttpUrl(urlValue);
    if (!validation.ok) {
      setFieldError(validation.error);
      setStatus('idle');
      return;
    }

    setFieldError('');
    setActionError('');
    setActionMessage('');
    setStatus('loading');
    const requestId = ++generationId.current;
    updateDraft(current => ({ ...current, url: validation.url, style, qrDataUrl: '' }));

    try {
      const qrDataUrl = await generateQrDataUrl(validation.url, style);
      if (requestId !== generationId.current) return;
      const persisted = updateDraft(current => ({ ...current, url: validation.url, style, qrDataUrl }));
      if (!persisted) {
        setActionError('El QR está listo, pero este dispositivo no pudo guardar el borrador para recuperarlo después.');
        setStatus('ready');
        return;
      }
      setStatus('ready');
    } catch {
      if (requestId !== generationId.current) return;
      setStatus('error');
      setActionError('No pudimos crear el código QR. Tu enlace sigue aquí.');
    }
  };

  const handleUrlChange = (event) => {
    generationId.current += 1;
    const url = event.target.value;
    updateDraft(current => ({
      ...current,
      url,
      qrDataUrl: '',
      backgroundImage: '',
      imageAspectRatio: 1,
    }));
    setFieldError('');
    setActionError('');
    setActionMessage('');
    setStatus('idle');
  };

  const handleStyleChange = (style) => {
    updateDraft(current => ({ ...current, style, qrDataUrl: '' }));
    generate(draft.url, style);
  };

  const download = async () => {
    setActionError('');
    try {
      await downloadDataUrl(draft.qrDataUrl, 'codigo-qr.png');
      setActionMessage('QR descargado.');
    } catch {
      setActionError('No pudimos descargar el QR. Intenta de nuevo.');
    }
  };

  const share = async () => {
    setActionError('');
    try {
      const result = await shareOrDownload(draft.qrDataUrl, 'codigo-qr.png', 'Código QR');
      if (result === 'shared') setActionMessage('QR compartido.');
      if (result === 'downloaded') setActionMessage('Tu dispositivo no permite compartir archivos. Descargamos el QR.');
    } catch {
      setActionError('No pudimos compartir ni descargar el QR. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          onClick={() => navigateBack(navigate, createPageUrl('More'))}
          className="flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Volver a Herramientas"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="ml-2 text-xl font-bold">Crear código QR</h1>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-col px-5 py-7 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {status === 'ready' && draft.qrDataUrl ? (
          <>
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm" aria-label="Código QR generado">
              <img src={draft.qrDataUrl} alt="Código QR listo para escanear" className="mx-auto h-auto w-full max-w-64" />
              <p className="mt-4 break-all text-center text-[15px] leading-relaxed text-muted-foreground">{draft.url}</p>
            </section>

            <fieldset className="mt-7">
              <legend className="text-[17px] font-bold">Tamaño del borde blanco</legend>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {QR_STYLES.map(style => (
                  <button
                    key={style.id}
                    type="button"
                    aria-pressed={draft.style === style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={`min-h-12 rounded-2xl border px-4 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${draft.style === style.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </fieldset>

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

            <Button type="button" size="lg" className="mt-7 w-full justify-between" onClick={() => navigate(createPageUrl('AddImageToQR'))}>
              Poner QR en una imagen <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                updateDraft(current => ({ ...current, qrDataUrl: '', backgroundImage: '' }));
                setStatus('idle');
              }}
            >
              Cambiar enlace
            </Button>
          </>
        ) : (
          <form className="flex flex-col" onSubmit={(event) => { event.preventDefault(); generate(); }} noValidate>
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-[2rem] bg-primary/10 text-primary" aria-hidden="true">
              {status === 'loading'
                ? <LoaderCircle className="h-14 w-14 animate-spin" />
                : <QrCode className="h-14 w-14" />}
            </div>
            <h2 className="mt-7 text-center text-2xl font-bold">¿Qué enlace quieres compartir?</h2>
            <p className="mt-2 text-center text-base leading-relaxed text-muted-foreground">
              El QR se crea en este dispositivo. Tu enlace no se envía a ningún servicio externo.
            </p>

            <div className="mt-8">
              <Label htmlFor="qr-url" className="text-[17px] font-semibold">Enlace completo</Label>
              <Input
                id="qr-url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={draft.url}
                onChange={handleUrlChange}
                aria-invalid={Boolean(fieldError)}
                aria-describedby="qr-url-help qr-url-error"
                placeholder="https://zynergia.pro"
                className="mt-3 h-14 rounded-2xl px-4 text-[17px] md:text-[17px]"
                disabled={status === 'loading'}
              />
              <p id="qr-url-help" className="mt-2 text-[15px] text-muted-foreground">Debe comenzar con http:// o https://</p>
              {fieldError && <p id="qr-url-error" className="mt-2 text-[15px] font-medium text-destructive" role="alert">{fieldError}</p>}
            </div>

            {status === 'error' && (
              <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
                <p className="text-[15px] text-destructive">{actionError}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="mt-7 w-full justify-between" disabled={status === 'loading'}>
              {status === 'loading' ? 'Creando QR…' : status === 'error' ? 'Intentar de nuevo' : 'Crear QR'}
              {status === 'loading' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
