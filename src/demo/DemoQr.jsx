import { useState } from 'react';
import { Download, LoaderCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadDataUrl, generateQrDataUrl, validateHttpUrl } from '@/lib/qr-tools';

export default function DemoQr() {
  const [url, setUrl] = useState('https://zynergia.pro/app');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const generate = async (event) => {
    event.preventDefault();
    const validation = validateHttpUrl(url);
    if (!validation.ok) {
      setMessage(validation.error);
      return;
    }
    setMessage('');
    setStatus('loading');
    try {
      setQrDataUrl(await generateQrDataUrl(validation.url));
      setUrl(validation.url);
      setStatus('ready');
    } catch {
      setStatus('idle');
      setMessage('No pudimos crear el QR. Tu enlace sigue aquí.');
    }
  };

  if (status === 'ready' && qrDataUrl) {
    return (
      <div className="space-y-5">
        <Card className="p-6 text-center">
          <img src={qrDataUrl} alt="Código QR de demostración listo" className="mx-auto w-full max-w-64" />
          <p className="mt-4 break-all text-[15px] leading-relaxed text-muted-foreground">{url}</p>
        </Card>
        <p className="rounded-2xl bg-blue-50 p-4 text-[15px] leading-relaxed text-blue-950">
          Este QR sólo contiene el enlace. Nunca incluye contraseña, sesión ni datos personales.
        </p>
        <Button type="button" size="lg" className="w-full" onClick={() => downloadDataUrl(qrDataUrl, 'qr-zynergia-demo.png')}>
          <Download aria-hidden="true" /> Descargar QR
        </Button>
        <Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={() => { setQrDataUrl(''); setStatus('idle'); }}>
          Cambiar enlace
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={generate} className="space-y-6">
      <div className="mx-auto grid h-32 w-32 place-items-center rounded-[2rem] bg-primary/10 text-primary">
        {status === 'loading' ? <LoaderCircle className="h-12 w-12 animate-spin" aria-hidden="true" /> : <QrCode className="h-12 w-12" aria-hidden="true" />}
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold">Crear un código QR</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">Pega el enlace que quieres compartir. El QR se crea en el teléfono.</p>
      </div>
      <label className="block">
        <span className="mb-2 block text-[16px] font-bold">Enlace completo</span>
        <input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={url} onChange={event => { setUrl(event.target.value); setMessage(''); }} className="h-14 w-full rounded-2xl border bg-white px-4 text-[17px]" placeholder="https://..." />
      </label>
      {message && <p className="rounded-2xl bg-red-50 p-4 text-[15px] font-semibold text-red-800" role="alert">{message}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Creando QR…' : 'Crear QR'}
      </Button>
      <p className="text-center text-[14px] leading-relaxed text-muted-foreground">Demostración local: no sube ni guarda el enlace.</p>
    </form>
  );
}
