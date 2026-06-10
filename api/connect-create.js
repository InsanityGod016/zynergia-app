import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Alta del socio en Stripe Connect (cuenta Express) — uso administrativo, una sola vez.
 *
 * Crea (o reutiliza) la cuenta Express del socio y devuelve:
 *   - account_id      → guárdalo en Vercel como STRIPE_PARTNER_ACCOUNT_ID
 *   - onboarding_url  → mándaselo al socio para que llene el formulario y conecte su banco
 *
 * Protegido con CONNECT_ADMIN_SECRET (env var) para que nadie más lo use.
 *
 * Uso:
 *   /api/connect-create?secret=TU_SECRET&country=MX&email=socio@correo.com
 * Para regenerar el link de un socio existente:
 *   /api/connect-create?secret=TU_SECRET&account_id=acct_XXXX
 */
export default async function handler(req, res) {
  const secret = req.query.secret;
  if (!process.env.CONNECT_ADMIN_SECRET || secret !== process.env.CONNECT_ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const country = (req.query.country || 'MX').toUpperCase();
    const email = req.query.email || undefined;
    const origin = req.headers.origin || `https://${req.headers.host}` || 'https://zynergia.pro';

    let accountId = req.query.account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          transfers: { requested: true },
        },
        // Cross-border (ej. plataforma US → socio MX): el socio solo RECIBE dinero,
        // por eso usa el acuerdo de servicio "recipient" (no procesa pagos).
        tos_acceptance: { service_agreement: 'recipient' },
        metadata: { role: 'zynergia_partner' },
      });
      accountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/connect-create?secret=${encodeURIComponent(secret)}&account_id=${accountId}`,
      return_url: `${origin}/landing?connect=listo`,
      type: 'account_onboarding',
    });

    res.status(200).json({
      account_id: accountId,
      onboarding_url: accountLink.url,
      pasos: [
        '1) Copia account_id y guárdalo en Vercel como STRIPE_PARTNER_ACCOUNT_ID',
        '2) Manda onboarding_url a tu socio para que llene el formulario y conecte su banco',
        '3) Haz redeploy. A partir de ahí cada pago reparte $2.90 a tu socio.',
      ],
    });
  } catch (err) {
    console.error('[connect-create]', err.message);
    res.status(500).json({ error: err.message });
  }
}
