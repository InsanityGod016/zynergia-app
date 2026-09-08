import { createOperationId } from '@/lib/operationId';

const STORAGE_KEY = 'zynergia_sale_draft_v1';
let memoryDraft = {};

export function normalizeSaleItems(items, legacyProductId = null) {
  const source = Array.isArray(items)
    ? items
    : legacyProductId
      ? [{ productId: legacyProductId, quantity: 1 }]
      : [];
  const quantities = new Map();
  source.forEach(item => {
    const productId = String(item?.productId || item?.product_id || '').trim();
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1) return;
    quantities.set(productId, Math.min(999, (quantities.get(productId) || 0) + quantity));
  });
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

export function saleUnitCount(items = []) {
  return normalizeSaleItems(items).reduce((total, item) => total + item.quantity, 0);
}

export function isValidSaleDate(value, latestAllowed) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const validCalendarDate = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
  return validCalendarDate && (!latestAllowed || value <= latestAllowed);
}

function normalizeDraft(value) {
  const draft = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  if (Object.keys(draft).length === 0) return {};
  const items = normalizeSaleItems(draft.items, draft.productId);
  return { ...draft, items, productId: items[0]?.productId || null };
}

export function readSaleDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return normalizeDraft(memoryDraft);
    return normalizeDraft(JSON.parse(stored));
  } catch {
    return normalizeDraft(memoryDraft);
  }
}

export function updateSaleDraft(patch) {
  const current = readSaleDraft();
  const merged = {
    ...current,
    ...patch,
    operationId: current.operationId || createOperationId(),
    updatedAt: new Date().toISOString(),
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'productId') && !Object.prototype.hasOwnProperty.call(patch, 'items')) {
    merged.items = patch.productId ? [{ productId: patch.productId, quantity: 1 }] : [];
  }
  const next = normalizeDraft(merged);
  memoryDraft = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* current-session fallback */ }
  return next;
}

export function clearSaleDraft() {
  memoryDraft = {};
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* already cleared in memory */ }
}

export function hasSaleDraft(draft = readSaleDraft()) {
  return Boolean(draft.operationId && (draft.contactId || normalizeSaleItems(draft.items, draft.productId).length || draft.purchaseDate || draft.saleType));
}

export function saleDraftStep(draft = readSaleDraft()) {
  if (!draft.contactId) return 'NewSale1';
  if (!normalizeSaleItems(draft.items, draft.productId).length) return 'NewSale2';
  if (!draft.purchaseDate) return 'NewSale3';
  return 'NewSale4';
}

export function saleDraftUrl(page = saleDraftStep(), draft = readSaleDraft()) {
  const params = new URLSearchParams();
  if (draft.contactId) params.set('contactId', draft.contactId);
  const firstProductId = normalizeSaleItems(draft.items, draft.productId)[0]?.productId;
  if (firstProductId) params.set('productId', firstProductId);
  if (draft.purchaseDate) params.set('purchaseDate', draft.purchaseDate);
  const query = params.toString();
  return `/${page}${query ? `?${query}` : ''}`;
}
