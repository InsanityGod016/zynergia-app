import { describe, expect, it } from 'vitest';
import {
  normalizeTemplateContent,
  parseTemplateContent,
  previewTemplate,
  unknownTemplateVariables,
} from '@/lib/templateVariables';

describe('template variables', () => {
  it('migrates the legacy product-link spelling to the canonical token', () => {
    expect(normalizeTemplateContent('Compra aquí: {{product.link_URL}}')).toBe('Compra aquí: {{product.link_url}}');
  });

  it('parses only allowlisted variables as atomic segments', () => {
    expect(parseTemplateContent('Hola {{contact.full_name}}, mira {{other.value}}')).toEqual([
      { type: 'text', value: 'Hola ' },
      { type: 'variable', value: '{{contact.full_name}}', label: 'Nombre' },
      { type: 'text', value: ', mira {{other.value}}' },
    ]);
    expect(unknownTemplateVariables('Hola {{other.value}}')).toEqual(['{{other.value}}']);
  });

  it('resolves a preview without leaving canonical variables', () => {
    expect(previewTemplate('{{contact.full_name}}: {{product.name}} {{product.link_url}}')).toBe(
      'María: BalanceOil+ https://tu-enlace.com'
    );
  });
});
