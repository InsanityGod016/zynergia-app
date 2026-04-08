/**
 * seedData.js — No-op with Supabase backend.
 *
 * Products and templates are static constants (DEFAULT_PRODUCTS / DEFAULT_TEMPLATES)
 * served directly by db.Product.list() and db.Template.list().
 * There is nothing to seed — the data is already available for every new user.
 */

export async function seedDefaultData() {
  // No-op: static data is merged at read time in db.js
}
