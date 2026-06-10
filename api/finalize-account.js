import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Finaliza la cuenta DESPUÉS de pagar — del lado servidor, idempotente.
 *
 * Se llama 2 veces desde /register:
 *   1) Al cargar la página (sin password): garantiza que la cuenta EXISTA apenas
 *      se confirma el pago, aunque el usuario cierre la ventana después.
 *   2) Al enviar el formulario (con password): fija la contraseña que el usuario eligió.
 *
 * Verifica el pago contra Stripe, crea/actualiza el usuario en Supabase (service role,
 * email auto-confirmado) y asegura su fila de settings con stripe_paid = true.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id, password } = req.body || {};
  if (!session_id || !session_id.startsWith('cs_')) {
    return res.status(400).json({ error: 'session_id inválido' });
  }

  try {
    // 1. Verificar el pago
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) {
      return res.status(402).json({ error: 'Pago no completado' });
    }

    const email = (session.customer_email || session.customer_details?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'No se encontró el correo del pago' });
    }

    const pwd = (typeof password === 'string' && password.length >= 6) ? password : null;

    // 2. Buscar usuario existente por correo
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = (list?.users || []).find(u => (u.email || '').toLowerCase() === email) || null;

    let userId;
    let created = false;

    if (!user) {
      const randomPwd = `Zyn-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: pwd || randomPwd,
        email_confirm: true,
        user_metadata: { stripe_session_id: session_id },
      });
      if (error) throw error;
      userId = data.user.id;
      created = true;
    } else {
      userId = user.id;
      if (pwd) {
        await admin.auth.admin.updateUserById(userId, { password: pwd, email_confirm: true });
      }
    }

    // 3. Asegurar la fila de settings (sin pisar datos que el usuario ya tenga)
    const { data: existing } = await admin
      .from('settings')
      .select('id, partner_code')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await admin.from('settings')
        .update({ stripe_paid: true, stripe_session_id: session_id })
        .eq('user_id', userId);
    } else {
      const letters = email.split('@')[0].replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
      const digits = String(Math.floor(Math.random() * 90) + 10);
      await admin.from('settings').insert({
        user_id: userId,
        user_name: email.split('@')[0],
        default_currency: 'MXN',
        notifications_enabled: true,
        stripe_paid: true,
        stripe_session_id: session_id,
        partner_code: letters + digits,
      });
    }

    res.status(200).json({ email, created, passwordSet: !!pwd });
  } catch (err) {
    console.error('[finalize-account]', err.message);
    res.status(500).json({ error: 'Error al finalizar la cuenta', detalle: err.message });
  }
}
