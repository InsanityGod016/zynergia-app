/**
 * defaultProducts.js — Catálogo base de productos Zynergia.
 * Fuente de verdad: Product_export.csv
 *
 * Categorías:
 *   "Premier Kits"  → frequency_months: 6 (ciclo recompra 180 días)
 *   "Compra Única"  → frequency_months: 1 (ciclo recompra 30 días)
 *
 * link_url vacío por defecto — cada usuario agrega el suyo en Products > EditProduct.
 */

export const DEFAULT_PRODUCTS = [

  // ── Premier Kits ──────────────────────────────────────────────────────────────

  // SANKI
  { name: 'Kit BelAge',               category: 'Premier Kits', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910924.png',      frequency_months: 6, link_url: '' },
  { name: 'Kit Kronuit Fire',         category: 'Premier Kits', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910925.png',      frequency_months: 6, link_url: '' },
  { name: 'Kit Inner 7',              category: 'Premier Kits', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910926.png',      frequency_months: 6, link_url: '' },
  { name: 'Kit Hasaki',               category: 'Premier Kits', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910927.png',      frequency_months: 6, link_url: '' },

  // ZURBITA
  { name: 'Kit Zeal',                 category: 'Premier Kits', subcategory: 'ZURBITA',                image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910744-001.png',  frequency_months: 6, link_url: '' },
  { name: 'Kit Zeal 10',              category: 'Premier Kits', subcategory: 'ZURBITA',                image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910745-001.png',  frequency_months: 6, link_url: '' },

  // ESSENTIALOIL+ KITS
  { name: 'Kit BalanceOil+',          category: 'Premier Kits', subcategory: 'ESSENTIALOIL+ KITS',     image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910702-002.png',  frequency_months: 6, link_url: '' },
  { name: 'Kit BalanceOil with Test', category: 'Premier Kits', subcategory: 'ESSENTIALOIL+ KITS',     image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910705-001.png',  frequency_months: 6, link_url: '' },

  // RESTORE SUPPLEMENT KITS
  { name: 'Kit Viv^+',               category: 'Premier Kits', subcategory: 'RESTORE SUPPLEMENT KITS', image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910285.png',     frequency_months: 6, link_url: '' },

  // IMMUNE SUPPLEMENT KITS
  { name: 'Kit Xtend',               category: 'Premier Kits', subcategory: 'IMMUNE SUPPLEMENT KITS', image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910348.png',      frequency_months: 6, link_url: '' },

  // COSMÉTICA CIENTÍFICA
  { name: 'Kit Serum',               category: 'Premier Kits', subcategory: 'COSMÉTICA CIENTÍFICA',      image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/910247.png',      frequency_months: 6, link_url: '' },

  // ── Compra Única ──────────────────────────────────────────────────────────────

  // SANKI
  { name: 'BelAge',                  category: 'Compra Única', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/911000.png',      frequency_months: 1, link_url: '' },
  { name: 'Kronuit',                 category: 'Compra Única', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/911010.png',      frequency_months: 1, link_url: '' },
  { name: 'Inner 7',                 category: 'Compra Única', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/911020.png',      frequency_months: 1, link_url: '' },
  { name: 'Hasaki',                  category: 'Compra Única', subcategory: 'SANKI',                  image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/911030.png',      frequency_months: 1, link_url: '' },

  // ZURBITA
  { name: 'Zeal - Mango',            category: 'Compra Única', subcategory: 'ZURBITA',                image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/301950-001.png',  frequency_months: 1, link_url: '' },
  { name: 'Zeal - Wild Berry',       category: 'Compra Única', subcategory: 'ZURBITA',                image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/301925-001.png',  frequency_months: 1, link_url: '' },
  { name: 'Zeal - Mango 10',         category: 'Compra Única', subcategory: 'ZURBITA',                image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/301225-001.png',  frequency_months: 1, link_url: '' },
  { name: 'Burn+',                   category: 'Compra Única', subcategory: 'ZURBITA',                image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/303150.png',      frequency_months: 1, link_url: '' },

  // MEGA SUPPLEMENTS
  { name: 'EssentOil+',              category: 'Compra Única', subcategory: 'MEGA SUPPLEMENTS',       image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/300000-001.png',  frequency_months: 1, link_url: '' },

  // RESTORE SUPPLEMENTS
  { name: 'Viv^+',                   category: 'Compra Única', subcategory: 'RESTORE SUPPLEMENTS',    image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/300810.png',      frequency_months: 1, link_url: '' },

  // IMMUNE SUPPLEMENTS
  { name: 'Xtend',                   category: 'Compra Única', subcategory: 'IMMUNE SUPPLEMENTS',     image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/300520.png',      frequency_months: 1, link_url: '' },

  // GUT HEALTH SUPPLEMENTS
  { name: 'ZinoBiotic+',             category: 'Compra Única', subcategory: 'GUT HEALTH SUPPLEMENTS', image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/301390-002.png',  frequency_months: 1, link_url: '' },

  // COSMÉTICA CIENTÍFICA
  { name: 'Serum',                   category: 'Compra Única', subcategory: 'COSMÉTICA CIENTÍFICA',   image_url: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/800150.png',      frequency_months: 1, link_url: '' },
];
