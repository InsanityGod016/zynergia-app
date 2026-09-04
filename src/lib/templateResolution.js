function taskSituation(task = {}) {
  if (task.situation) return task.situation;
  if (task.category === 'recompra' || task.category === 'reactivacion') return 'repurchase';
  if (task.task_area === 'prospecto_producto') return 'product-prospect';
  if (task.task_area === 'prospecto_partner') return 'business';
  if (task.task_area === 'partner') return 'fast-start';
  if (task.task_area === 'referidos') return 'referral';
  if (task.task_area === 'manual') return 'manual';
  return 'product';
}

function templateSituation(template = {}) {
  if (template.situation) return template.situation;
  const value = String(template.subcategory || '');
  if (value === 'referido') return 'referral';
  if (value.startsWith('partner_')) return 'fast-start';
  if (value.startsWith('prospecto_partner')) return 'business';
  if (value.startsWith('prospecto_producto')) return 'product-prospect';
  if (value.includes('dias_antes') || value.includes('dias_despues') || value.includes('reactivacion') || template.category === 'recompra') return 'repurchase';
  if (value === 'manual') return 'manual';
  return 'product';
}

function exactSubcategory(template, task) {
  const taskSubcategory = task.template_subcategory || task.subcategory;
  return Boolean(taskSubcategory && template.subcategory === taskSubcategory);
}

/**
 * Orders templates by the product contract:
 * explicit task → contact default → general default → system fallback.
 * Non-default custom templates remain available after those automatic choices.
 */
export function orderTemplatesForTask(templates = [], task = {}, contact = {}) {
  // Legacy task rows do not yet have template_id. Manual tasks store the
  // selected public template id in template_subcategory until the reviewed
  // migration is available, so the user's choice is still deterministic.
  const legacyExplicitId = templates.some(template => String(template.id) === String(task.template_subcategory || ''))
    ? task.template_subcategory
    : null;
  const explicitId = task.template_id || task.message_template_id || legacyExplicitId;
  const situation = taskSituation(task);
  const matching = templates.filter(template => (
    String(template.id) === String(explicitId || '')
    || exactSubcategory(template, task)
    || templateSituation(template) === situation
  ));

  const rank = template => {
    if (explicitId && String(template.id) === String(explicitId)) return 0;
    if (template.is_default && template.contact_id && String(template.contact_id) === String(contact.id)) return 10;
    if (template.is_default && !template.contact_id) return 20;
    if (template.origin === 'system') return exactSubcategory(template, task) ? 30 : 31;
    return exactSubcategory(template, task) ? 40 : 41;
  };

  return matching
    .filter(template => !template.contact_id || String(template.contact_id) === String(contact.id))
    .sort((left, right) => rank(left) - rank(right));
}

export function resolveTemplateForTask(templates, task, contact, tone) {
  const ordered = orderTemplatesForTask(templates, task, contact);
  return ordered.find(template => template.tone === tone) || ordered[0] || null;
}

export { taskSituation, templateSituation };
