export const TEMPLATE_VARIABLES = [
  { value: '{{contact.full_name}}', label: 'Nombre' },
  { value: '{{product.name}}', label: 'Producto' },
  { value: '{{product.link_url}}', label: 'Enlace de compra' },
];

const LABELS = new Map(TEMPLATE_VARIABLES.map(variable => [variable.value, variable.label]));
const VARIABLE_PATTERN = /\{\{[^{}]+\}\}/g;
const ALLOWED_PATTERN = /(\{\{contact\.full_name\}\}|\{\{product\.name\}\}|\{\{product\.link_url\}\})/g;

export function normalizeTemplateContent(value = '') {
  return String(value).replaceAll('{{product.link_URL}}', '{{product.link_url}}');
}

export function templateVariableLabel(value) {
  return LABELS.get(value) || value;
}

export function parseTemplateContent(value = '') {
  return normalizeTemplateContent(value)
    .split(ALLOWED_PATTERN)
    .filter(Boolean)
    .map(part => LABELS.has(part) ? { type: 'variable', value: part, label: LABELS.get(part) } : { type: 'text', value: part });
}

export function unknownTemplateVariables(value = '') {
  return [...normalizeTemplateContent(value).matchAll(VARIABLE_PATTERN)]
    .map(match => match[0])
    .filter(variable => !LABELS.has(variable));
}

export function previewTemplate(value, { contactName = 'María', productName = 'BalanceOil+', productLink = 'https://tu-enlace.com' } = {}) {
  return normalizeTemplateContent(value)
    .replaceAll('{{contact.full_name}}', contactName)
    .replaceAll('{{product.name}}', productName)
    .replaceAll('{{product.link_url}}', productLink);
}
