import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Tablas con datos del usuario (todas tienen columna user_id)
const USER_TABLES = [
  'tasks',
  'sales',
  'contacts',
  'partners',
  'tags',
  'product_links',
  'user_templates',
  'notifications',
  'settings',
];

/**
 * Eliminación de cuenta in-app (requisito Apple 5.1.1(v) y Google Play).
 * El cliente manda su access_token; verificamos identidad, borramos todos
 * sus datos y después el usuario de auth. Irreversible.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // Identificar al usuario dueño del token (nadie puede borrar cuentas ajenas)
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }
    const userId = userData.user.id;

    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error && error.code !== '42P01') {
        // 42P01 = tabla no existe; cualquier otro error sí importa
        console.error(`[delete-account] error borrando ${table}:`, error.message);
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('[delete-account]', err.message);
    res.status(500).json({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' });
  }
}
