import prodBelage from '@/assets/products/prod_belage.png';
import prodBurn from '@/assets/products/prod_burn.png';
import prodEssentoil from '@/assets/products/prod_essentoil.png';
import prodHasaki from '@/assets/products/prod_hasaki.png';
import prodInner7 from '@/assets/products/prod_inner_7.png';
import prodKitBalanceoil from '@/assets/products/prod_kit_balanceoil.png';
import prodKitBalanceoilWithTest from '@/assets/products/prod_kit_balanceoil_with_test.png';
import prodKitBelage from '@/assets/products/prod_kit_belage.png';
import prodKitHasaki from '@/assets/products/prod_kit_hasaki.png';
import prodKitInner7 from '@/assets/products/prod_kit_inner_7.png';
import prodKitKronuitFire from '@/assets/products/prod_kit_kronuit_fire.png';
import prodKitSerum from '@/assets/products/prod_kit_serum.png';
import prodKitViv from '@/assets/products/prod_kit_viv.png';
import prodKitXtend from '@/assets/products/prod_kit_xtend.png';
import prodKitZeal from '@/assets/products/prod_kit_zeal.png';
import prodKitZeal10 from '@/assets/products/prod_kit_zeal_10.png';
import prodKronuit from '@/assets/products/prod_kronuit.png';
import prodSerum from '@/assets/products/prod_serum.png';
import prodViv from '@/assets/products/prod_viv.png';
import prodXtend from '@/assets/products/prod_xtend.png';
import prodZealMango from '@/assets/products/prod_zeal_mango.png';
import prodZealMango10 from '@/assets/products/prod_zeal_mango_10.png';
import prodZealWildBerry from '@/assets/products/prod_zeal_wild_berry.png';
import prodZinobiotic from '@/assets/products/prod_zinobiotic.png';

/**
 * Catálogo original de Zynergia.
 *
 * Los IDs son parte del contrato histórico: ventas, tareas y enlaces personales
 * los usan como referencia. `cycle_days` es la duración operativa; el campo
 * `frequency_months` se conserva para lectores antiguos.
 */
export const DEFAULT_PRODUCTS = [
  { id: 'prod_kit_belage', name: 'Kit BelAge', category: 'Premier Kits', subcategory: 'SANKI', image_url: prodKitBelage, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_kronuit_fire', name: 'Kit Kronuit Fire', category: 'Premier Kits', subcategory: 'SANKI', image_url: prodKitKronuitFire, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_inner_7', name: 'Kit Inner 7', category: 'Premier Kits', subcategory: 'SANKI', image_url: prodKitInner7, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_hasaki', name: 'Kit Hasaki', category: 'Premier Kits', subcategory: 'SANKI', image_url: prodKitHasaki, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_zeal', name: 'Kit Zeal', category: 'Premier Kits', subcategory: 'ZURBITA', image_url: prodKitZeal, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_zeal_10', name: 'Kit Zeal 10', category: 'Premier Kits', subcategory: 'ZURBITA', image_url: prodKitZeal10, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_balanceoil', name: 'Kit BalanceOil+', category: 'Premier Kits', subcategory: 'ESSENTIALOIL+ KITS', image_url: prodKitBalanceoil, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_balanceoil_with_test', name: 'Kit BalanceOil with Test', category: 'Premier Kits', subcategory: 'ESSENTIALOIL+ KITS', image_url: prodKitBalanceoilWithTest, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_viv', name: 'Kit Viv^+', category: 'Premier Kits', subcategory: 'RESTORE SUPPLEMENT KITS', image_url: prodKitViv, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_xtend', name: 'Kit Xtend', category: 'Premier Kits', subcategory: 'IMMUNE SUPPLEMENT KITS', image_url: prodKitXtend, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_kit_serum', name: 'Kit Serum', category: 'Premier Kits', subcategory: 'COSMÉTICA CIENTÍFICA', image_url: prodKitSerum, frequency_months: 6, cycle_days: 180, link_url: '' },
  { id: 'prod_belage', name: 'BelAge', category: 'Compra Única', subcategory: 'SANKI', image_url: prodBelage, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_kronuit', name: 'Kronuit', category: 'Compra Única', subcategory: 'SANKI', image_url: prodKronuit, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_inner_7', name: 'Inner 7', category: 'Compra Única', subcategory: 'SANKI', image_url: prodInner7, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_hasaki', name: 'Hasaki', category: 'Compra Única', subcategory: 'SANKI', image_url: prodHasaki, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_zeal_mango', name: 'Zeal - Mango', category: 'Compra Única', subcategory: 'ZURBITA', image_url: prodZealMango, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_zeal_wild_berry', name: 'Zeal - Wild Berry', category: 'Compra Única', subcategory: 'ZURBITA', image_url: prodZealWildBerry, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_zeal_mango_10', name: 'Zeal - Mango 10', category: 'Compra Única', subcategory: 'ZURBITA', image_url: prodZealMango10, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_burn', name: 'Burn+', category: 'Compra Única', subcategory: 'ZURBITA', image_url: prodBurn, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_essentoil', name: 'EssentOil+', category: 'Compra Única', subcategory: 'MEGA SUPPLEMENTS', image_url: prodEssentoil, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_viv', name: 'Viv^+', category: 'Compra Única', subcategory: 'RESTORE SUPPLEMENTS', image_url: prodViv, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_xtend', name: 'Xtend', category: 'Compra Única', subcategory: 'IMMUNE SUPPLEMENTS', image_url: prodXtend, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_zinobiotic', name: 'ZinoBiotic+', category: 'Compra Única', subcategory: 'GUT HEALTH SUPPLEMENTS', image_url: prodZinobiotic, frequency_months: 1, cycle_days: 30, link_url: '' },
  { id: 'prod_serum', name: 'Serum', category: 'Compra Única', subcategory: 'COSMÉTICA CIENTÍFICA', image_url: prodSerum, frequency_months: 1, cycle_days: 30, link_url: '' },
];
