/**
 * db.js — Supabase backend adapter for Zynergia.
 *
 * Exposes the same list/create/update/delete/filter interface that the codebase
 * used with base44.entities.X, so page-level code only needs to change its import.
 *
 * Special entities:
 *  - Product  → static DEFAULT_PRODUCTS merged with user's product_links table
 *  - Template → static DEFAULT_TEMPLATES merged with user's user_templates table
 *  - Settings → upserts on create (one row per user)
 *  - Notification → supports (orderBy, limit) on list()
 */

import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_PRODUCTS } from '@/lib/defaultProducts';
import { DEFAULT_TEMPLATES } from '@/lib/defaultTemplates';

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── ID generation for static entities ────────────────────────────────────────

function productId(name) {
  return 'prod_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function templateId(subcategory, tone) {
  return `${subcategory}__${tone}`;
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
        .insert({ ...payload, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
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

// ── Product — static + user link overrides ───────────────────────────────────

const Product = {
  async list() {
    const uid = await getUserId();
    const base = DEFAULT_PRODUCTS.map(p => ({ ...p, id: productId(p.name) }));
    if (!uid) return base;

    const { data: links } = await supabase
      .from('product_links')
      .select('product_id, link_url')
      .eq('user_id', uid);

    if (!links || links.length === 0) return base;
    const linkMap = Object.fromEntries(links.map(l => [l.product_id, l.link_url]));
    return base.map(p => (linkMap[p.id] !== undefined ? { ...p, link_url: linkMap[p.id] } : p));
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    if (payload.link_url !== undefined) {
      const { error } = await supabase
        .from('product_links')
        .upsert(
          { user_id: uid, product_id: id, link_url: payload.link_url },
          { onConflict: 'user_id,product_id' }
        );
      if (error) throw error;
    }
    const products = await Product.list();
    return products.find(p => p.id === id);
  }
};

// ── Template — static + user content overrides ───────────────────────────────

const Template = {
  async list() {
    const uid = await getUserId();
    const base = DEFAULT_TEMPLATES.map(t => ({ ...t, id: templateId(t.subcategory, t.tone) }));
    if (!uid) return base;

    const { data: overrides } = await supabase
      .from('user_templates')
      .select('template_id, content')
      .eq('user_id', uid);

    if (!overrides || overrides.length === 0) return base;
    const overMap = Object.fromEntries(overrides.map(o => [o.template_id, o.content]));
    return base.map(t => (overMap[t.id] !== undefined ? { ...t, content: overMap[t.id] } : t));
  },

  async update(id, payload) {
    const uid = await getUserId();
    if (!uid) throw new Error('Not authenticated');
    if (payload.content !== undefined) {
      const { error } = await supabase
        .from('user_templates')
        .upsert(
          { user_id: uid, template_id: id, content: payload.content },
          { onConflict: 'user_id,template_id' }
        );
      if (error) throw error;
    }
    const templates = await Template.list();
    return templates.find(t => t.id === id);
  }
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
      .insert({ ...payload, user_id: uid, created_date: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('notifications')
      .update(payload)
      .eq('id', id)
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
      .upsert({ ...payload, user_id: uid }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('settings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

export const db = {
  Contact: makeEntity('contacts'),
  Task: makeEntity('tasks'),
  Sale: makeEntity('sales'),
  Partner: makeEntity('partners'),
  Tag: makeEntity('tags'),
  Product,
  Template,
  Notification,
  Settings,
};
