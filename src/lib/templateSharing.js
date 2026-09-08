import { templateSituation } from '@/lib/templateResolution';

export const TEMPLATE_SITUATIONS = [
  { value: 'repurchase', label: 'Recompra' },
  { value: 'product', label: 'Seguimiento de producto' },
  { value: 'product-prospect', label: 'Prospecto de producto' },
  { value: 'business', label: 'Prospecto de negocio' },
  { value: 'fast-start', label: 'Partner / Fast Start' },
  { value: 'referral', label: 'Referidos' },
  { value: 'manual', label: 'Mensaje manual' },
];

export function templateSituationLabel(value) {
  return TEMPLATE_SITUATIONS.find(item => item.value === value)?.label || 'Seguimiento';
}

export function templatesForCategory(templates = [], categoryValue = '') {
  if (!categoryValue) return [];
  if (categoryValue.startsWith('custom:')) {
    const categoryId = categoryValue.slice('custom:'.length);
    return templates.filter(template => String(template.category_id || '') === categoryId);
  }
  if (categoryValue.startsWith('situation:')) {
    const situation = categoryValue.slice('situation:'.length);
    return templates.filter(template => templateSituation(template) === situation);
  }
  return [];
}
