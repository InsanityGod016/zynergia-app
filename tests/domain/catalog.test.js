import { describe, expect, it } from 'vitest';
import { DEFAULT_PRODUCTS } from '@/lib/defaultProducts';

describe('original product catalogue', () => {
  it('keeps the 24 stable IDs used by historical sales and links', () => {
    expect(DEFAULT_PRODUCTS).toHaveLength(24);
    expect(new Set(DEFAULT_PRODUCTS.map(product => product.id)).size).toBe(24);
    expect(DEFAULT_PRODUCTS.find(product => product.id === 'prod_kit_balanceoil')).toMatchObject({
      name: 'Kit BalanceOil+', cycle_days: 180, frequency_months: 6,
    });
    expect(DEFAULT_PRODUCTS.find(product => product.id === 'prod_zinobiotic')).toMatchObject({
      name: 'ZinoBiotic+', cycle_days: 30, frequency_months: 1,
    });
  });

  it('bundles the original images locally and keeps every classification', () => {
    for (const product of DEFAULT_PRODUCTS) {
      expect(product.image_url).toContain('/products/');
      expect(product.image_url).toMatch(/\.png(?:\?.*)?$/);
      expect(product.image_url).not.toMatch(/^https?:\/\//);
      expect(product.category).toMatch(/^(Premier Kits|Compra Única)$/);
      expect(product.subcategory).toBeTruthy();
    }

    expect(new Set(DEFAULT_PRODUCTS.map(product => product.image_url)).size).toBe(24);
  });
});
