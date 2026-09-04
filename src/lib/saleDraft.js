const STORAGE_KEY = 'zynergia_sale_draft_v1';
let memoryDraft = {};

function operationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function readSaleDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return memoryDraft;
    const value = JSON.parse(stored);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : memoryDraft;
  } catch {
    return memoryDraft;
  }
}

export function updateSaleDraft(patch) {
  const current = readSaleDraft();
  const next = {
    ...current,
    ...patch,
    operationId: current.operationId || operationId(),
    updatedAt: new Date().toISOString(),
  };
  memoryDraft = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* current-session fallback */ }
  return next;
}

export function clearSaleDraft() {
  memoryDraft = {};
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* already cleared in memory */ }
}

export function hasSaleDraft(draft = readSaleDraft()) {
  return Boolean(draft.operationId && (draft.contactId || draft.productId || draft.purchaseDate || draft.saleType));
}

export function saleDraftStep(draft = readSaleDraft()) {
  if (!draft.contactId) return 'NewSale1';
  if (!draft.productId) return 'NewSale2';
  if (!draft.purchaseDate) return 'NewSale3';
  return 'NewSale4';
}

export function saleDraftUrl(page = saleDraftStep(), draft = readSaleDraft()) {
  const params = new URLSearchParams();
  if (draft.contactId) params.set('contactId', draft.contactId);
  if (draft.productId) params.set('productId', draft.productId);
  if (draft.purchaseDate) params.set('purchaseDate', draft.purchaseDate);
  const query = params.toString();
  return `/${page}${query ? `?${query}` : ''}`;
}
