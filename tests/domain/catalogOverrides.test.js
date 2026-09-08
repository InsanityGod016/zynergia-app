import { expect, test, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { mergeMessageTemplates, mergeUserProducts } from '@/api/db';

test('partial legacy rows keep bundled product and template metadata', () => {
  const [product] = mergeUserProducts([
    { id: 'prod_one', name: 'Producto original', category: 'Premier Kits', image_url: '/products/one.png', cycle_days: 30 },
  ], [
    { id: 'row-product', product_id: 'prod_one', name: null, category: null, image_url: null, cycle_days: null, link_url: 'https://example.com/comprar' },
  ]);

  expect(product).toMatchObject({
    id: 'prod_one',
    name: 'Producto original',
    category: 'Premier Kits',
    image_url: '/products/one.png',
    cycle_days: 30,
    link_url: 'https://example.com/comprar',
  });

  const [template] = mergeMessageTemplates([
    { id: 'recompra__general', template_id: 'recompra__general', name: 'Recompra', category: 'producto', tone: 'general', content: 'Original' },
  ], [
    { id: 'row-template', template_id: 'recompra__general', name: null, category: null, tone: null, content: 'Mensaje personalizado' },
  ]);

  expect(template).toMatchObject({
    id: 'recompra__general',
    name: 'Recompra',
    category: 'producto',
    tone: 'general',
    content: 'Mensaje personalizado',
  });
});

test('an explicitly disabled repurchase cycle is not replaced by the catalog default', () => {
  const [product] = mergeUserProducts([
    { id: 'prod_one', name: 'Producto original', category: 'Premier Kits', cycle_days: 30 },
  ], [
    { id: 'row-product', product_id: 'prod_one', cycle_days: 0, repurchase_enabled: false },
  ]);

  expect(product.cycle_days).toBe(0);
  expect(product.repurchase_enabled).toBe(false);
});
