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
      cycle_days: Number(row.cycle_days) || original?.cycle_days || 30,
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

const Product = {
  async list() {
    const uid = await getUserId();
    const defaults = baseProducts();
    if (!uid) return defaults;
    const legacy = await legacyProductLinks(uid, defaults);
    const rows = await readOptionalTable('user_products', uid);
    return rows === null ? legacy : mergeUserProducts(legacy, rows);
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
      let query;
      if (existing) {
        query = supabase.from('user_products').update(ownedPayload(payload)).eq('id', existing.id).eq('user_id', uid);
      } else if (baseProducts().some(product => product.id === id)) {
        query = supabase.from('user_products').insert({ ...ownedPayload(payload), product_id: id, user_id: uid, origin: 'system' });
      } else {
        throw new Error('Producto no encontrado');
      }
      const { error } = await query;
      if (error) throw error;
    } else {
      const unsupported = Object.keys(payload).filter(key => key !== 'link_url');
      if (unsupported.length) throw unavailableFeature('La edición completa de productos todavía no está habilitada en esta cuenta.');
      const { error } = await supabase.from('product_links').upsert(
        { user_id: uid, product_id: id, link_url: payload.link_url || '' },
        { onConflict: 'user_id,product_id' }
      );
      if (error) throw error;
    }
    const products = await Product.list();
    return products.find(p => p.id === id);
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
    const { data, error } = await supabase
      .from('message_templates')
      .insert({ ...values, template_id, user_id: uid, origin: 'user' })
      .select()
      .single();
    if (error) throw error;
    return { ...data, id: template_id, template_id, _row_id: data.id, origin: 'user' };
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const rows = await readOptionalTable('message_templates', uid);
    if (rows !== null) {
      const existing = rows.find(row => (row.template_id || row.id) === id);
      let query;
      if (existing) {
        query = supabase.from('message_templates').update(ownedPayload(payload)).eq('id', existing.id).eq('user_id', uid);
      } else if (baseTemplates().some(template => template.id === id)) {
        query = supabase.from('message_templates').insert({ ...ownedPayload(payload), template_id: id, user_id: uid, origin: 'system' });
      } else {
        throw new Error('Plantilla no encontrada');
      }
      const { error } = await query;
      if (error) throw error;
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
    return Template.update(id, { archived_at: new Date().toISOString() });
  },

  async setDefault(id) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    const templates = await Template.list();
    const target = templates.find(template => template.id === id);
    if (!target) throw new Error('Plantilla no encontrada');
    const rows = await readOptionalTable('message_templates', uid);
    if (rows === null) throw unavailableFeature('Las plantillas predeterminadas todavía no están habilitadas en esta cuenta.');
    const situation = templateSituation(target);
    let clear = supabase.from('message_templates').update({ is_default: false }).eq('user_id', uid).eq('situation', situation);
    clear = target.contact_id ? clear.eq('contact_id', target.contact_id) : clear.is('contact_id', null);
    const { error } = await clear;
    if (error) throw error;
    return Template.update(id, { is_default: true, situation });
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
  Partner: makeEntity('partners'),
  Tag: makeEntity('tags'),
  Product,
  Template,
  Notification,
  Settings,
};
