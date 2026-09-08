import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('contact batches are authenticated, idempotent, tenant-bound and transactional', async () => {
  const migration = await source('supabase/migrations/202609070001_contacts_and_product_images.sql');

  for (const rpc of ['import_contacts', 'bulk_update_contact_type', 'bulk_anonymize_contacts']) {
    const body = migration.split(`create or replace function public.${rpc}`)[1];
    expect(body).toMatch(/security definer/);
    expect(body).toMatch(/set search_path = ''/);
    expect(body).toMatch(/auth\.uid\(\)/);
    expect(body).toMatch(/has_app_entitlement\(v_user_id\)/);
    expect(migration).toMatch(new RegExp(`grant execute on function public\\.${rpc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\([\\s\\S]+to authenticated`));
  }

  expect(migration).toMatch(/primary key \(user_id, operation_id\)/);
  expect(migration).toMatch(/operation_id_reused_with_different_contact_batch/);
  expect(migration).toMatch(/contact\.user_id = v_user_id/);
  expect(migration).toMatch(/linked_partner_type_protected/);
  expect(migration).toMatch(/linked_partner_delete_protected/);
  expect(migration).toMatch(/perform public\.anonymize_contact\(v_contact_id\)/);
  expect(migration).toMatch(/revoke delete on table public\.contacts from authenticated/);
});

test('the first-access import invitation is optional, user-scoped, and defers device permission', async () => {
  const app = await source('src/App.jsx');
  const contacts = await source('src/pages/Contacts.jsx');
  const importer = await source('src/components/contacts/ImportContactsSheet.jsx');

  expect(app).toContain('zynergia-contact-import-invite-v1:${user.id}');
  expect(app).toContain('¿Quieres importar tus contactos?');
  expect(app).toContain("navigate('/Contacts?import=1')");
  expect(contacts).toMatch(/searchParams\.get\('import'\) !== '1'/);
  expect(importer).toMatch(/onClick=\{loadContacts\}/);
  expect(importer.split('const loadContacts = async () => {')[1].split('const toggleCandidate')[0]).toMatch(/DeviceContacts\.find\(/);
  expect(app).not.toMatch(/requestPermissions\(|DeviceContacts\.find\(/);
});

test('manual contact forms persist the normalized and original phone contract', async () => {
  const [phoneField, create, edit, message] = await Promise.all([
    source('src/components/contacts/PhoneField.jsx'),
    source('src/pages/NewContact.jsx'),
    source('src/pages/EditContact.jsx'),
    source('src/pages/SelectMessageTone.jsx'),
  ]);

  expect(phoneField).toMatch(/value=\{selectedCountryIso\}/);
  expect(phoneField).toMatch(/onCountryIsoChange/);
  for (const form of [create, edit]) {
    expect(form).toMatch(/phone_e164: normalized(?:Phone)?\.e164/);
    expect(form).toMatch(/phone_country_iso: formData\.phone_country_iso/);
    expect(form).toMatch(/phone_raw: formData\.phone/);
  }
  expect(message).toMatch(/contact\?\.phone_e164 \|\| contact\?\.phone/);
});

test('product photos use a private owner-only bucket while legacy URLs remain readable', async () => {
  const migration = await source('supabase/migrations/202609070001_contacts_and_product_images.sql');
  const editor = await source('src/pages/EditProduct.jsx');
  const database = await source('src/api/db.js');
  const androidManifest = await source('android/app/src/main/AndroidManifest.xml');

  expect(migration).toMatch(/add column if not exists image_path text/);
  expect(migration).toMatch(/alter extension pgcrypto set schema extensions/);
  expect(migration).toMatch(/create or replace function public\.classify_legacy_task_origin/);
  expect(migration).toMatch(/tasks_classify_legacy_origin/);
  expect(migration).toMatch(/new\.product_id is not null and \(/);
  expect(migration).toMatch(/Referral rows remain[\s\S]+indistinguishable/);
  expect(migration).not.toMatch(/task_area in \('prospecto_producto', 'prospecto_partner', 'referidos'\)/);
  expect(migration).not.toMatch(/new\.task_area in \('prospecto_producto', 'prospecto_partner', 'referidos'\)/);
  expect(migration).toMatch(/new\.task_name like 'Prospecto Producto – %'/);
  expect(migration).toMatch(/'product-images', 'product-images', false/);
  expect(migration).toMatch(/product_images_select_own[\s\S]+storage\.foldername\(name\)/);
  expect(migration).toMatch(/product_images_insert_own[\s\S]+storage\.foldername\(name\)/);
  expect(migration).toMatch(/revoke delete on table public\.user_products from authenticated/);
  expect(database).toMatch(/createSignedUrls\(paths, 86400\)/);
  expect(database).toMatch(/async uploadImage\(blob\)/);
  expect(database).toMatch(/Date\.now\(\)\.toString\(16\)/);
  expect(database).not.toMatch(/fileId[\s\S]{0,160}toString\(36\)/);
  expect(editor).not.toContain('Enlace de imagen');
  expect(editor).not.toMatch(/validOptionalUrl\(image_url\)/);
  expect(editor).toMatch(/image_path: uploadedPath \|\| null, image_url: null/);
  expect(editor).toMatch(/product\.origin === 'user' && product\.image_url/);
  expect(editor).toMatch(/repurchase_enabled \? Number\(form\.cycle_days\) : 0/);
  expect(editor).toMatch(/repurchase_enabled && \(!Number\.isInteger\(cycle_days\)/);
  expect(editor).toMatch(/Camera\.takePhoto/);
  expect(editor).toMatch(/Camera\.chooseFromGallery/);
  const productContract = database.split('const Product = {')[1].split('// ── Template')[0];
  const updateProduct = productContract.split('async update(id, payload) {')[1].split('async archive(id)')[0];
  expect(updateProduct).toMatch(/query\.select\(\)\.single\(\)/);
  expect(updateProduct).not.toMatch(/Product\.list\(\)/);
  expect(androidManifest).toMatch(/READ_CONTACTS/);
  expect(androidManifest).toMatch(/WRITE_CONTACTS" tools:node="remove"/);
});

test('product and template editors protect unsaved changes from native Back', async () => {
  const editors = await Promise.all([
    source('src/pages/EditProduct.jsx'),
    source('src/pages/EditTemplate.jsx'),
  ]);

  for (const editor of editors) {
    expect(editor).toMatch(/new CustomEvent\('zynergia:dirty-state', \{ detail: \{ dirty \} \}\)/);
    expect(editor).toMatch(/addEventListener\('zynergia:request-back', goBack\)/);
    expect(editor).toMatch(/addEventListener\('beforeunload', warnBeforeUnload\)/);
  }
});

test('changing a contact import batch resets its idempotency operation', async () => {
  const importer = await source('src/components/contacts/ImportContactsSheet.jsx');
  const toggleBody = importer.split('const toggleCandidate = (id) => {')[1].split('const updateCandidate')[0];
  const updateBody = importer.split('const updateCandidate = (id, changes) => {')[1].split('const importSelected')[0];

  expect(toggleBody).toContain("operationId.current = ''");
  expect(updateBody).toContain("operationId.current = ''");
});
