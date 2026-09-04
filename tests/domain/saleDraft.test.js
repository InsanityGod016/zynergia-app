import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSaleDraft,
  hasSaleDraft,
  readSaleDraft,
  saleDraftStep,
  saleDraftUrl,
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
});
