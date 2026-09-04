import { describe, expect, it } from 'vitest';
import { orderTemplatesForTask, resolveTemplateForTask, templateSituation } from '../../src/lib/templateResolution';

const task = {
  id: 'task-1',
  category: 'recompra',
  task_area: 'producto',
  template_subcategory: 'producto_7_dias_antes',
};
const contact = { id: 'contact-1' };

function template(id, overrides = {}) {
  return {
    id,
    category: 'recompra',
    subcategory: 'producto_7_dias_antes',
    situation: 'repurchase',
    tone: 'general',
    origin: 'user',
    ...overrides,
  };
}

describe('template resolution priority', () => {
  it('classifies legacy templates with the same situations used by task filters', () => {
    expect(templateSituation({ subcategory: 'producto_7_dias_antes' })).toBe('repurchase');
    expect(templateSituation({ subcategory: 'prospecto_producto_dia_3' })).toBe('product-prospect');
    expect(templateSituation({ subcategory: 'prospecto_partner_dia_7' })).toBe('business');
    expect(templateSituation({ subcategory: 'partner_qteam_dia_1' })).toBe('fast-start');
  });

  it('uses the template explicitly selected on the task first', () => {
    const templates = [
      template('system', { origin: 'system' }),
      template('contact-default', { is_default: true, contact_id: contact.id }),
      template('explicit'),
    ];
    expect(orderTemplatesForTask(templates, { ...task, template_id: 'explicit' }, contact)[0].id).toBe('explicit');
  });

  it('keeps an explicit template selected by a legacy manual task', () => {
    const templates = [template('system', { origin: 'system' }), template('explicit')];
    expect(orderTemplatesForTask(templates, { ...task, template_subcategory: 'explicit' }, contact)[0].id).toBe('explicit');
  });

  it('prefers contact default, then general default, then the exact system template', () => {
    const templates = [
      template('system-broad', { origin: 'system', subcategory: 'producto_recompra' }),
      template('system-exact', { origin: 'system' }),
      template('general-default', { is_default: true }),
      template('contact-default', { is_default: true, contact_id: contact.id }),
    ];
    expect(orderTemplatesForTask(templates, task, contact).map(item => item.id)).toEqual([
      'contact-default', 'general-default', 'system-exact', 'system-broad',
    ]);
  });

  it('never selects a template assigned to another contact', () => {
    const templates = [
      template('wrong-contact', { is_default: true, contact_id: 'contact-2' }),
      template('system', { origin: 'system' }),
    ];
    expect(resolveTemplateForTask(templates, task, contact, 'general')?.id).toBe('system');
  });

  it('keeps the priority while selecting another available tone', () => {
    const templates = [
      template('system-friendly', { origin: 'system', tone: 'amigable' }),
      template('default-friendly', { is_default: true, tone: 'amigable' }),
    ];
    expect(resolveTemplateForTask(templates, task, contact, 'amigable')?.id).toBe('default-friendly');
  });
});
