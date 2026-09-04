import QRCode from 'qrcode';

const DRAFT_VERSION = 1;
const POSITION_IDS = new Set(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right', 'manual']);

export const QR_STYLES = [
  { id: 'comfortable', label: 'Borde amplio', margin: 4 },
  { id: 'classic', label: 'Borde normal', margin: 2 },
  { id: 'compact', label: 'Borde corto', margin: 1 },
];

export const QR_SIZES = [
  { id: 'small', label: 'Pequeño', ratio: 0.2 },
  { id: 'medium', label: 'Mediano', ratio: 0.27 },
  { id: 'large', label: 'Grande', ratio: 0.34 },
];

export const QR_POSITIONS = [
  { id: 'top-left', label: 'Arriba izquierda' },
  { id: 'top-right', label: 'Arriba derecha' },
  { id: 'center', label: 'Al centro' },
  { id: 'bottom-left', label: 'Abajo izquierda' },
  { id: 'bottom-right', label: 'Abajo derecha' },
];

export function createQrDraft(value = {}) {
  const placement = value.placement || {};
  const preset = POSITION_IDS.has(placement.preset) ? placement.preset : 'bottom-left';
  const size = Number.isFinite(placement.size) && placement.size >= 0.18 && placement.size <= 0.4
    ? placement.size
    : 0.27;

  return {
    version: DRAFT_VERSION,
    url: typeof value.url === 'string' ? value.url : '',
    qrDataUrl: typeof value.qrDataUrl === 'string' && value.qrDataUrl.startsWith('data:image/')
      ? value.qrDataUrl
      : '',
    style: QR_STYLES.some(style => style.id === value.style) ? value.style : 'classic',
    backgroundImage: typeof value.backgroundImage === 'string' && value.backgroundImage.startsWith('data:image/')
      ? value.backgroundImage
      : '',
    imageAspectRatio: Number.isFinite(value.imageAspectRatio) && value.imageAspectRatio > 0
      ? value.imageAspectRatio
      : 1,
    placement: {
      preset,
      size,
      x: Number.isFinite(placement.x) ? placement.x : 0,
      y: Number.isFinite(placement.y) ? placement.y : 0,
    },
  };
}

function draftKey(userId) {
  return `zynergia_qr_draft_v${DRAFT_VERSION}_${userId || 'session'}`;
}

export function loadQrDraft(userId, storage = globalThis.sessionStorage) {
  if (!storage) return createQrDraft();
  try {
    const stored = JSON.parse(storage.getItem(draftKey(userId)) || 'null');
    return createQrDraft(stored || {});
  } catch {
    return createQrDraft();
  }
}

export function saveQrDraft(userId, value, storage = globalThis.sessionStorage) {
  if (!storage) return false;
  try {
    storage.setItem(draftKey(userId), JSON.stringify(createQrDraft(value)));
    return true;
  } catch {
    return false;
  }
}

export function clearQrDraft(userId, storage = globalThis.sessionStorage) {
  try {
    storage?.removeItem(draftKey(userId));
  } catch {
    // Storage can be unavailable in private browsing; there is nothing else to clear.
  }
}

export function validateHttpUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: 'Escribe o pega un enlace.' };
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: 'El enlace debe comenzar con http:// o https://.' };
    }
    return { ok: true, url: parsed.href };
  } catch {
    return { ok: false, error: 'Revisa el enlace. Por ejemplo: https://zynergia.pro' };
  }
}

export async function generateQrDataUrl(url, styleId = 'classic') {
  const style = QR_STYLES.find(item => item.id === styleId) || QR_STYLES[1];
  return QRCode.toDataURL(url, {
    width: 600,
    margin: style.margin,
    errorCorrectionLevel: 'H',
    color: { dark: '#0F172AFF', light: '#FFFFFFFF' },
  });
}

export function resolveQrPlacement(placement, width, height) {
  if (!(width > 0) || !(height > 0)) return { x: 0, y: 0, size: 0 };

  const ratio = Math.min(0.4, Math.max(0.18, placement?.size || 0.27));
  const size = Math.min(width * ratio, height * 0.6);
  const margin = Math.min(width, height) * 0.04;
  const maxX = Math.max(0, width - size);
  const maxY = Math.max(0, height - size);
  const clamp = (value, max) => Math.min(max, Math.max(0, value));

  switch (placement?.preset) {
    case 'top-left': return { x: clamp(margin, maxX), y: clamp(margin, maxY), size };
    case 'top-right': return { x: clamp(width - size - margin, maxX), y: clamp(margin, maxY), size };
    case 'center': return { x: maxX / 2, y: maxY / 2, size };
    case 'bottom-right': return { x: clamp(width - size - margin, maxX), y: clamp(height - size - margin, maxY), size };
    case 'manual': return {
      x: clamp((placement.x || 0) * width, maxX),
      y: clamp((placement.y || 0) * height, maxY),
      size,
    };
    default: return { x: clamp(margin, maxX), y: clamp(height - size - margin, maxY), size };
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No pudimos leer esta imagen.'));
    reader.readAsDataURL(file);
  });
}

export function loadDataImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No pudimos abrir esta imagen.'));
    image.src = source;
  });
}

export async function prepareBackgroundImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Elige un archivo de imagen.');
  if (file.size > 20 * 1024 * 1024) throw new Error('La imagen pesa demasiado. Elige una menor de 20 MB.');

  const image = await loadDataImage(await readFile(file));
  const scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este dispositivo no pudo preparar la imagen.');
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.84),
    aspectRatio: width / height,
  };
}

export async function composeQrImage(draft) {
  if (!draft?.backgroundImage || !draft?.qrDataUrl) throw new Error('Falta la imagen o el código QR.');
  const [background, qr] = await Promise.all([
    loadDataImage(draft.backgroundImage),
    loadDataImage(draft.qrDataUrl),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = background.naturalWidth;
  canvas.height = background.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este dispositivo no pudo preparar el resultado.');
  context.drawImage(background, 0, 0, canvas.width, canvas.height);
  const placement = resolveQrPlacement(draft.placement, canvas.width, canvas.height);
  context.fillStyle = '#FFFFFF';
  const padding = Math.max(2, placement.size * 0.015);
  context.fillRect(
    placement.x - padding,
    placement.y - padding,
    placement.size + padding * 2,
    placement.size + padding * 2,
  );
  context.drawImage(qr, placement.x, placement.y, placement.size, placement.size);
  return canvas.toDataURL('image/png');
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('No pudimos preparar el archivo.');
  return response.blob();
}

async function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  const revoke = () => URL.revokeObjectURL(objectUrl);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(revoke);
  else revoke();
}

export async function downloadDataUrl(dataUrl, filename) {
  await downloadBlob(await dataUrlToBlob(dataUrl), filename);
}

export async function shareOrDownload(dataUrl, filename, title) {
  const blob = await dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: 'image/png' });
  const shareData = { files: [file], title };
  const canShareFiles = typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && navigator.canShare(shareData);

  if (canShareFiles) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }

  await downloadBlob(blob, filename);
  return 'downloaded';
}

export function navigateBack(navigate, fallback) {
  if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
  else navigate(fallback, { replace: true });
}
