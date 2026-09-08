/**
 * db.js — Supabase backend adapter for Zynergia.
 *
 * Exposes the list/create/update/delete/filter interface used by the screens.
 *
 * Special entities:
 *  - Product  → original catalogue + user_products, with product_links fallback
 *  - Template → built-ins + message_templates, with user_templates fallback
 *  - Settings → upserts on create (one row per user)
 *  - Notification → supports (orderBy, limit) on list()
 */

import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_PRODUCTS } from '@/lib/defaultProducts';
import { DEFAULT_TEMPLATES } from '@/lib/defaultTemplates';
import { templateSituation } from '@/lib/templateResolution';
import { normalizeTemplateContent } from '@/lib/templateVariables';

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

function ownedPayload(payload) {
  const safe = { ...(payload || {}) };
  delete safe.user_id;
  return safe;
}

// ── ID generation for static entities ────────────────────────────────────────

function productId(name) {
  return 'prod_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function templateId(subcategory, tone) {
  return `${subcategory}__${tone}`;
}

function safeDefaultTemplate(template) {
  if (!template.subcategory?.startsWith('partner_')) return template;
  const subcategory = template.subcategory;
  if (subcategory === 'partner_invitar_zynergia') {
    const contentByTone = {
      general: 'Hola {{contact.full_name}}, te invito a usar Zynergia para organizar tus seguimientos y que podamos revisar juntos tu avance: https://zynergia.pro/app',
      amigable: '¡Hola {{contact.full_name}}! 😊 Te comparto Zynergia para que organices tus seguimientos y podamos revisar juntos tu avance: https://zynergia.pro/app',
      directo: 'Hola {{contact.full_name}}, descarga Zynergia e inicia sesión para organizar tus seguimientos y vincular tu avance: https://zynergia.pro/app',
    };
    return { ...template, content: contentByTone[template.tone] || contentByTone.general };
  }
  const context = subcategory.includes('qteam')
    ? 'tu avance en Q-Team'
    : subcategory.includes('fs_n1') || subcategory.includes('smart_fs1')
      ? 'tu avance en Fast Start Nivel 1'
        : subcategory.includes('fs_n2') || subcategory.includes('smart_fs2')
        ? 'cómo va la duplicación de tu equipo'
        : subcategory.includes('xteam')
          ? 'tu avance en X-Team'
          : 'tu etapa actual de Fast Start';
  const contentByTone = {
    general: `Hola {{contact.full_name}}, quiero revisar ${context}. Cuéntame qué has logrado y en qué puedo apoyarte.`,
    amigable: `¡Hola {{contact.full_name}}! 😊 ¿Cómo va ${context}? Estoy aquí para ayudarte con el siguiente paso.`,
    directo: `Hola {{contact.full_name}}, revisemos ${context}: ¿qué completaste, qué sigue y qué apoyo necesitas?`,
  };
  return {
    ...template,
    content: contentByTone[template.tone] || contentByTone.general,
  };
}

function schemaUnavailable(error) {
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error?.code);
}

function unavailableFeature(message) {
  return Object.assign(new Error(message), { code: 'FEATURE_NOT_CONFIGURED' });
}

function stableCustomId(prefix) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}

// ── Generic CRUD factory ──────────────────────────────────────────────────────

function makeEntity(table) {
  return {
    async list(orderBy) {
      const uid = await getUserId();
      if (!uid) return [];
      let q = supabase.from(table).select('*').eq('user_id', uid);
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const col = desc ? orderBy.slice(1) : orderBy;
        q = q.order(col, { ascending: !desc });
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async create(payload) {
      const uid = await getUserId();
      if (!uid) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from(table)
        .insert({ ...ownedPayload(payload), user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const uid = await getUserId();
      if (!uid) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from(table)
        .update(ownedPayload(payload))
        .eq('id', id)
        .eq('user_id', uid)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const uid = await getUserId();
      if (!uid) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', uid);
      if (error) throw error;
    },

    async filter(where) {
      const uid = await getUserId();
      if (!uid) return [];
      let q = supabase.from(table).select('*').eq('user_id', uid);
      for (const [key, val] of Object.entries(where)) {
        q = q.eq(key, val);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    }
  };
}

const Contact = {
  ...makeEntity('contacts'),
  async importBatch(operationId, contacts) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase.rpc('import_contacts', {
      p_operation_id: operationId,
      p_contacts: contacts,
    });
    if (error) throw error;
    return data;
  },
  async bulkChangeType(operationId, contactIds, contactType) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase.rpc('bulk_update_contact_type', {
      p_operation_id: operationId,
      p_contact_ids: contactIds,
      p_contact_type: contactType,
    });
    if (error) throw error;
    return data;
  },
  async bulkAnonymize(operationId, contactIds) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase.rpc('bulk_anonymize_contacts', {
      p_operation_id: operationId,
      p_contact_ids: contactIds,
    });
    if (error) throw error;
    return data;
  },
  async anonymize(id) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase.rpc('anonymize_contact', { p_contact_id: id });
    if (error) throw error;
    return data;
  },
};

// ── Product — catalogue + full user overrides, legacy links as fallback ─────

function baseProducts() {
  return DEFAULT_PRODUCTS.map(p => ({ ...p, id: p.id || productId(p.name), origin: 'system' }));
}

function nonNullFields(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null));
}

export function mergeUserProducts(defaults, rows) {
  const byId = new Map(defaults.map(product => [product.id, product]));
  for (const row of rows || []) {
    const publicId = row.product_id || row.id;
    if (!publicId) continue;
    const original = byId.get(publicId);
    byId.set(publicId, {
      ...(original || {}),
      ...nonNullFields(row),
      id: publicId,
      _row_id: row.id,
      origin: original ? 'system' : 'user',
      cycle_days: row.cycle_days === null || row.cycle_days === undefined
        ? (original?.cycle_days ?? 30)
        : Number(row.cycle_days),
      frequency_months: Number(row.frequency_months) || original?.frequency_months || 1,
    });
  }
  return [...byId.values()].filter(product => !product.archived_at);
}

async function readOptionalTable(table, uid) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', uid);
  if (schemaUnavailable(error)) return null;
  if (error) throw error;
  return data || [];
}

async function legacyProductLinks(uid, defaults) {
  const { data, error } = await supabase
    .from('product_links')
    .select('product_id, link_url')
    .eq('user_id', uid);
  if (schemaUnavailable(error)) return defaults;
  if (error) throw error;
  const links = Object.fromEntries((data || []).map(link => [link.product_id, link.link_url]));
  return defaults.map(product => links[product.id] === undefined ? product : { ...product, link_url: links[product.id] });
}

async function resolveProductImages(rows) {
  const paths = [...new Set((rows || []).map(row => row.image_path).filter(Boolean))];
  if (!paths.length) return rows;
  const { data, error } = await supabase.storage.from('product-images').createSignedUrls(paths, 86400);
  if (error) return rows;
  const signedByPath = new Map((data || []).map(item => [item.path, item.signedUrl]));
  return rows.map(row => signedByPath.has(row.image_path)
    ? { ...row, image_url: signedByPath.get(row.image_path) }
    : row);
}

const Product = {
  newId() {
    return stableCustomId('prod_custom');
  },

  async list() {
    const uid = await getUserId();
    const defaults = baseProducts();
    if (!uid) return defaults;
    const legacy = await legacyProductLinks(uid, defaults);
    const rows = await readOptionalTable('user_products', uid);
    return rows === null ? legacy : mergeUserProducts(legacy, await resolveProductImages(rows));
  },

  async uploadImage(blob) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    if (!(blob instanceof Blob) || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size > 3145728) {
      throw new Error('La imagen debe ser JPG, PNG o WebP y pesar menos de 3 MB.');
    }
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const fileId = globalThis.crypto?.randomUUID?.()
      || `${Date.now().toString(16)}-${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
    const path = `${uid}/${fileId}.${extension}`;
    const { error } = await supabase.storage.from('product-images').upload(path, blob, {
      cacheControl: '3600',
      contentType: blob.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  },

  async deleteImage(path) {
    const uid = await getUserId();
    if (!uid || !path || !String(path).startsWith(`${uid}/`)) return;
    const { error } = await supabase.storage.from('product-images').remove([path]);
    if (error) throw error;
  },

  async create(payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const rows = await readOptionalTable('user_products', uid);
    if (rows === null) throw unavailableFeature('La creación de productos todavía no está habilitada en esta cuenta.');
    const product_id = payload.id || stableCustomId('prod_custom');
    const values = ownedPayload(payload);
    delete values.id;
    const { data, error } = await supabase
      .from('user_products')
      .insert({ ...values, product_id, user_id: uid, origin: 'user' })
      .select()
      .single();
    if (error) throw error;
    return { ...data, id: product_id, _row_id: data.id, origin: 'user' };
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const rows = await readOptionalTable('user_products', uid);
    if (rows !== null) {
      const existing = rows.find(row => (row.product_id || row.id) === id);
      const defaultProduct = baseProducts().find(product => product.id === id);
      let query;
      if (existing) {
        query = supabase.from('user_products').update(ownedPayload(payload)).eq('id', existing.id).eq('user_id', uid);
      } else if (defaultProduct) {
        query = supabase.from('user_products').insert({ ...ownedPayload(payload), product_id: id, user_id: uid, origin: 'system' });
      } else {
        throw new Error('Producto no encontrado');
      }
      const { data, error } = await query.select().single();
      if (error) throw error;
      return {
        ...(defaultProduct || {}),
        ...(existing || {}),
        ...data,
        ...ownedPayload(payload),
        id,
        _row_id: data.id,
      };
    } else {
      const unsupported = Object.keys(payload).filter(key => key !== 'link_url');
      if (unsupported.length) throw unavailableFeature('La edición completa de productos todavía no está habilitada en esta cuenta.');
      const { error } = await supabase.from('product_links').upsert(
        { user_id: uid, product_id: id, link_url: payload.link_url || '' },
        { onConflict: 'user_id,product_id' }
      );
      if (error) throw error;
      return {
        ...(baseProducts().find(product => product.id === id) || {}),
        ...payload,
        id,
      };
    }
  },

  async archive(id) {
    return Product.update(id, { archived_at: new Date().toISOString() });
  },
};

// ── Template — built-ins + full user templates, legacy content fallback ─────

function baseTemplates() {
  return DEFAULT_TEMPLATES.map(template => {
    const safe = safeDefaultTemplate(template);
    return {
      ...safe,
      content: normalizeTemplateContent(safe.content),
      id: templateId(safe.subcategory, safe.tone),
      template_id: templateId(safe.subcategory, safe.tone),
      origin: 'system',
    };
  });
}

export function mergeMessageTemplates(defaults, rows) {
  const byId = new Map(defaults.map(template => [template.id, template]));
  for (const row of rows || []) {
    const publicId = row.template_id || row.id;
    if (!publicId) continue;
    const original = byId.get(publicId);
    byId.set(publicId, {
      ...(original || {}),
      ...nonNullFields(row),
      id: publicId,
      template_id: publicId,
      _row_id: row.id,
      origin: original ? 'system' : 'user',
      content: normalizeTemplateContent(row.content ?? original?.content ?? ''),
    });
  }
  return [...byId.values()].filter(template => !template.archived_at);
}

async function legacyTemplates(uid, defaults) {
  const { data, error } = await supabase
    .from('user_templates')
    .select('template_id, content')
    .eq('user_id', uid);
  if (schemaUnavailable(error)) return defaults;
  if (error) throw error;
  const overrides = Object.fromEntries((data || []).map(row => [row.template_id, row.content]));
  return defaults.map(template => overrides[template.id] === undefined ? template : { ...template, content: normalizeTemplateContent(overrides[template.id]) });
}

function templateWriteValues(template) {
  return {
    name: template.name,
    content: normalizeTemplateContent(template.content || ''),
    situation: templateSituation(template),
    category: template.category,
    subcategory: template.subcategory,
    tone: template.tone || 'general',
    contact_id: template.contact_id || null,
    category_id: template.category_id || null,
  };
}

async function persistTemplateRow(uid, template) {
  const template_id = template.template_id || template.id;
  if (template._row_id) {
    const values = templateWriteValues(template);
    const { data, error } = await supabase.rpc('update_message_template', {
      p_template_id: template_id,
      p_name: values.name,
      p_content: values.content,
      p_situation: values.situation,
      p_category: values.category,
      p_subcategory: values.subcategory,
      p_tone: values.tone,
      p_contact_id: values.contact_id,
      p_category_id: values.category_id,
    });
    if (error) throw error;
    return { ...data, id: template_id, template_id, _row_id: data.id };
  }
  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      ...templateWriteValues(template),
      template_id,
      user_id: uid,
      origin: template.origin === 'system' ? 'system' : 'user',
      is_default: false,
    })
    .select()
    .single();
  if (!error) return { ...data, id: template_id, template_id, _row_id: data.id };
  if (error.code !== '23505') throw error;
  const { data: existing, error: existingError } = await supabase
    .from('message_templates')
    .select('*')
    .eq('user_id', uid)
    .eq('template_id', template_id)
    .single();
  if (existingError) throw existingError;
  return { ...existing, id: template_id, template_id, _row_id: existing.id };
}

const Template = {
  async list() {
    const uid = await getUserId();
    const defaults = baseTemplates();
    if (!uid) return defaults;
    const legacy = await legacyTemplates(uid, defaults);
    const rows = await readOptionalTable('message_templates', uid);
    return rows === null ? legacy : mergeMessageTemplates(legacy, rows);
  },

  async create(payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const rows = await readOptionalTable('message_templates', uid);
    if (rows === null) throw unavailableFeature('La creación de plantillas todavía no está habilitada en esta cuenta.');
    const template_id = payload.id || stableCustomId('tpl_custom');
    const values = ownedPayload(payload);
    delete values.id;
    const shouldBeDefault = Boolean(values.is_default);
    values.is_default = shouldBeDefault;
    const { data, error } = await supabase
      .from('message_templates')
      .insert({ ...values, template_id, user_id: uid, origin: 'user' })
      .select()
      .single();
    if (error) throw error;
    if (shouldBeDefault) {
      const { error: defaultError } = await supabase.rpc('set_template_default', {
        p_template_id: template_id,
        p_enabled: true,
      });
      if (defaultError) throw defaultError;
    }
    return { ...data, id: template_id, template_id, _row_id: data.id, origin: 'user', is_default: shouldBeDefault };
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const rows = await readOptionalTable('message_templates', uid);
    if (rows !== null) {
      const existing = rows.find(row => (row.template_id || row.id) === id);
      const templates = await Template.list();
      const target = templates.find(template => template.id === id);
      if (!target) throw new Error('Plantilla no encontrada');
      const merged = { ...target, ...ownedPayload(payload), id, template_id: id };
      if (existing) {
        await persistTemplateRow(uid, { ...merged, _row_id: existing.id });
      } else if (baseTemplates().some(template => template.id === id)) {
        await persistTemplateRow(uid, { ...merged, origin: 'system' });
      } else {
        throw new Error('Plantilla no encontrada');
      }
      if (Object.hasOwn(payload, 'is_default')) {
        const { error } = await supabase.rpc('set_template_default', {
          p_template_id: id,
          p_enabled: Boolean(payload.is_default),
        });
        if (error) throw error;
      }
    } else {
      const unsupported = Object.keys(payload).filter(key => key !== 'content');
      if (unsupported.length) throw unavailableFeature('La edición completa de plantillas todavía no está habilitada en esta cuenta.');
      const { error } = await supabase.from('user_templates').upsert(
        { user_id: uid, template_id: id, content: payload.content },
        { onConflict: 'user_id,template_id' }
      );
      if (error) throw error;
    }
    const templates = await Template.list();
    return templates.find(t => t.id === id);
  },

  async archive(id) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const templates = await Template.list();
    const target = templates.find(template => template.id === id);
    if (!target) throw new Error('Plantilla no encontrada');
    await persistTemplateRow(uid, target);
    const { data, error } = await supabase.rpc('archive_message_template', { p_template_id: id });
    if (error) throw error;
    return data;
  },

  async setDefault(id, enabled = true) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const templates = await Template.list();
    const target = templates.find(template => template.id === id);
    if (!target) throw new Error('Plantilla no encontrada');
    const rows = await readOptionalTable('message_templates', uid);
    if (rows === null) throw unavailableFeature('Las plantillas predeterminadas todavía no están habilitadas en esta cuenta.');
    await persistTemplateRow(uid, target);
    const { data, error } = await supabase.rpc('set_template_default', {
      p_template_id: id,
      p_enabled: Boolean(enabled),
    });
    if (error) throw error;
    return data;
  },
};

// ── Template categories and immutable share bundles ─────────────────────────

const TemplateCategory = {
  async list() {
    const uid = await getUserId();
    if (!uid) return [];
    const rows = await readOptionalTable('template_categories', uid);
    if (rows === null) throw unavailableFeature('Las categorías de plantillas todavía no están habilitadas en esta cuenta.');
    return rows.filter(category => !category.archived_at).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  async create(payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('template_categories')
      .insert({ ...ownedPayload(payload), user_id: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase.rpc('update_template_category', {
      p_category_id: id,
      p_name: payload.name,
      p_situation: payload.situation,
    });
    if (error) throw error;
    return data;
  },

  async archive(id) {
    const { data, error } = await supabase.rpc('archive_template_category', { p_category_id: id });
    if (error) throw error;
    return data;
  },
};

const TemplateShare = {
  async list() {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('template_share_bundles')
      .select('id, expires_at, revoked_at, created_at, snapshot')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
    if (schemaUnavailable(error)) return [];
    if (error) throw error;
    return data || [];
  },

  async create(operationId, templates) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    await Promise.all(templates.map(template => persistTemplateRow(uid, template)));
    const { data, error } = await supabase.rpc('create_template_share', {
      p_operation_id: operationId,
      p_template_ids: templates.map(template => template.template_id || template.id),
    });
    if (error) throw error;
    return data;
  },

  async preview(token) {
    const { data, error } = await supabase.rpc('preview_template_share', { p_token: token });
    if (error) throw error;
    return data;
  },

  async import(operationId, token) {
    const { data, error } = await supabase.rpc('import_template_share', {
      p_operation_id: operationId,
      p_token: token,
    });
    if (error) throw error;
    return data;
  },

  async revoke(id) {
    const { data, error } = await supabase.rpc('revoke_template_share', { p_share_id: id });
    if (error) throw error;
    return data;
  },
};

// ── Notification — supports (orderBy, limit) ─────────────────────────────────

const Notification = {
  async list(orderBy, limit) {
    const uid = await getUserId();
    if (!uid) return [];
    let q = supabase.from('notifications').select('*').eq('user_id', uid);
    if (orderBy) {
      const desc = orderBy.startsWith('-');
      const col = desc ? orderBy.slice(1) : orderBy;
      q = q.order(col, { ascending: !desc });
    }
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async create(payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('notifications')
      .insert({ ...ownedPayload(payload), user_id: uid, created_date: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('notifications')
      .update(ownedPayload(payload))
      .eq('id', id)
      .eq('user_id', uid)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ── Settings — upsert on create (one row per user) ───────────────────────────

const Settings = {
  async list() {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', uid);
    if (error) throw error;
    return data ?? [];
  },

  async create(payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('settings')
      .upsert({ ...ownedPayload(payload), user_id: uid }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('settings')
      .update(ownedPayload(payload))
      .eq('id', id)
      .eq('user_id', uid)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

export const db = {
  Contact,
  Task: makeEntity('tasks'),
  Sale: makeEntity('sales'),
  SaleOrder: makeEntity('sale_orders'),
  Partner: makeEntity('partners'),
  Tag: makeEntity('tags'),
  Product,
  Template,
  TemplateCategory,
  TemplateShare,
  Notification,
  Settings,
};
