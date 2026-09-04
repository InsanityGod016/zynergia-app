import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { APP_DOWNLOAD_LINKS } from '@/lib/app-links';

export default function DownloadChoices({ className = '', showQr = true }) {
  const [qrImages, setQrImages] = useState({});

  useEffect(() => {
    if (!showQr) return undefined;
    let cancelled = false;

    Promise.all(
      APP_DOWNLOAD_LINKS.map(async link => [
        link.platform,
        await QRCode.toDataURL(link.url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        }),
      ])
    ).then(entries => {
      if (!cancelled) setQrImages(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setQrImages({});
    });

    return () => {
      cancelled = true;
    };
  }, [showQr]);

  return (
    <div className={className}>
      <div className="store-links">
        {APP_DOWNLOAD_LINKS.map(link => (
          <a key={link.platform} className="store-badge-link" href={link.url} aria-label={link.store}>
            <img className="store-badge" src={link.badgeSrc} alt={link.store} />
          </a>
        ))}
      </div>

      {showQr && (
        <div className="desktop-store-qr" aria-label="Codigos QR para descargar Zynergia">
          {APP_DOWNLOAD_LINKS.map(link => (
            <div key={link.platform} className="store-qr-card">
              <a className="store-badge-link store-badge-link--qr" href={link.url} aria-label={link.store}>
                <img className="store-badge" src={link.badgeSrc} alt={link.store} />
              </a>
              {qrImages[link.platform]
                ? <img className="download-qr" src={qrImages[link.platform]} alt={`Codigo QR para ${link.store}`} />
                : <div className="download-qr download-qr--loading" aria-hidden="true" />}
              <a href={link.url}>Abrir enlace</a>
            </div>
          ))}
          <small>Los QR solo abren la tienda. No contienen tu contraseña ni inician sesion por ti.</small>
        </div>
      )}
    </div>
  );
}
