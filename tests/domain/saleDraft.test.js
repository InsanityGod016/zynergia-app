import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSaleDraft,
  hasSaleDraft,
  isValidSaleDate,
  normalizeSaleItems,
  readSaleDraft,
  saleDraftStep,
  saleDraftUrl,
  saleUnitCount,
  updateSaleDraft,
} from '@/lib/saleDraft';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe('saleDraft characterization', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    clearSaleDraft();
  });

  it('keeps one operation id while a sale advances through its steps', () => {
    const first = updateSaleDraft({ contactId: 'contact-1' });
    const second = updateSaleDraft({ productId: 'product-1', purchaseDate: '2026-08-19' });

    expect(second.operationId).toBe(first.operationId);
    expect(second.operationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(readSaleDraft()).toMatchObject({
      contactId: 'contact-1',
      productId: 'product-1',
      purchaseDate: '2026-08-19',
    });
    expect(saleDraftUrl('NewSale4', second)).toBe(
      '/NewSale4?contactId=contact-1&productId=product-1&purchaseDate=2026-08-19'
    );
  });

  it('resumes at the first incomplete step and never clears implicitly', () => {
    expect(hasSaleDraft()).toBe(false);
    const first = updateSaleDraft({ contactId: 'contact-1' });
    expect(hasSaleDraft(first)).toBe(true);
    expect(saleDraftStep(first)).toBe('NewSale2');
    expect(saleDraftUrl(undefined, first)).toBe('/NewSale2?contactId=contact-1');

    const third = updateSaleDraft({ productId: 'product-1', purchaseDate: '2026-08-19' });
    expect(saleDraftStep(third)).toBe('NewSale4');
  });

  it('creates a new operation only after the previous draft is explicitly cleared', () => {
    const previous = updateSaleDraft({ contactId: 'contact-1' });
    clearSaleDraft();
    const next = updateSaleDraft({ contactId: 'contact-2' });
    expect(next.operationId).not.toBe(previous.operationId);
  });

  it('stores multiple products, combines duplicates, and counts quantities', () => {
    const draft = updateSaleDraft({
      contactId: 'contact-1',
      items: [
        { productId: 'kit-a', quantity: 2 },
        { productId: 'kit-b', quantity: 1 },
        { productId: 'kit-a', quantity: 3 },
      ],
    });

    expect(draft.items).toEqual([
      { productId: 'kit-a', quantity: 5 },
      { productId: 'kit-b', quantity: 1 },
    ]);
    expect(saleUnitCount(draft.items)).toBe(6);
    expect(saleDraftStep(draft)).toBe('NewSale3');
  });

  it('upgrades a released single-product draft without losing it', () => {
    localStorage.setItem('zynergia_sale_draft_v1', JSON.stringify({
      operationId: 'legacy-operation',
      contactId: 'contact-1',
      productId: 'legacy-kit',
    }));

    expect(readSaleDraft()).toMatchObject({
      productId: 'legacy-kit',
      items: [{ productId: 'legacy-kit', quantity: 1 }],
    });
    expect(normalizeSaleItems([{ product_id: 'kit-a', quantity: 2 }])).toEqual([
      { productId: 'kit-a', quantity: 2 },
    ]);
  });

  it('clears a finished draft and safely ignores malformed storage', () => {
    updateSaleDraft({ contactId: 'contact-1' });
    clearSaleDraft();
    expect(readSaleDraft()).toEqual({});

    localStorage.setItem('zynergia_sale_draft_v1', '{not-json');
    expect(readSaleDraft()).toEqual({});
  });

  it('keeps the current-session draft if device storage is temporarily unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('storage unavailable'); },
      removeItem: () => undefined,
    });
    const draft = updateSaleDraft({ contactId: 'contact-1' });
    expect(readSaleDraft()).toEqual(draft);
  });

  it('accepts real calendar dates through today and rejects malformed or future dates', () => {
    expect(isValidSaleDate('2026-09-07', '2026-09-07')).toBe(true);
    expect(isValidSaleDate('2026-02-29', '2026-09-07')).toBe(false);
    expect(isValidSaleDate('2026-09-08', '2026-09-07')).toBe(false);
    expect(isValidSaleDate('09/07/2026', '2026-09-07')).toBe(false);
  });
});
