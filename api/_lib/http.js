const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

function configuredOrigins() {
  const values = [
    'capacitor://localhost',
    'https://localhost',
    ...(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  ];

  if (process.env.APP_URL) {
    try {
      values.push(new URL(process.env.APP_URL).origin);
    } catch {
      // APP_URL is validated when a redirect URL is needed.
    }
  }

  return new Set(values);
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (!origin) return true;

  if (!configuredOrigins().has(origin)) {
    res.status(403).json({ error: 'Origen no permitido', code: 'ORIGIN_NOT_ALLOWED' });
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  return true;
}

export async function handleApi(req, res, { methods, label }, action) {
  if (!applyCors(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!methods.includes(req.method)) {
    res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '));
    res.status(405).json({ error: 'Método no permitido', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    await action();
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof HttpError
      ? error.message
      : 'No se pudo completar la solicitud.';

    if (status >= 500) {
      console.error(`[${label}]`, error);
    }
    if (!res.headersSent) res.status(status).json({ error: message, code });
  }
}

async function readStream(req, maxBytes) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      throw new HttpError(413, 'BODY_TOO_LARGE', 'La solicitud es demasiado grande.');
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

export async function readJson(req, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const body = Buffer.isBuffer(req.body)
    ? req.body
    : typeof req.body === 'string'
      ? Buffer.from(req.body)
      : await readStream(req, maxBytes);

  if (body.length > maxBytes) {
    throw new HttpError(413, 'BODY_TOO_LARGE', 'La solicitud es demasiado grande.');
  }
  if (body.length === 0) return {};

  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'El cuerpo JSON no es válido.');
  }
}

export async function readRawBody(req, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  // Vercel exposes req.body through a lazy getter. Reading the stream first
  // preserves the exact bytes required for webhook signature verification.
  if (typeof req?.[Symbol.asyncIterator] === 'function' && req.readableEnded !== true) {
    return readStream(req, maxBytes);
  }
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body !== undefined && req.body !== null) {
    throw new HttpError(400, 'RAW_BODY_UNAVAILABLE', 'No se pudo verificar el webhook.');
  }
  return readStream(req, maxBytes);
}

export function bearerToken(req) {
  const match = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, 'AUTH_REQUIRED', 'Inicia sesión para continuar.');
  return match[1];
}

export function isOperationId(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
