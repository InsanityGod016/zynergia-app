import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan = 'monthly', email } = req.body;

    const priceId = plan === 'annual'
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: 'Precio no configurado. Agrega STRIPE_MONTHLY_PRICE_ID en las variables de entorno.' });
    }

    const origin = req.headers.origin || process.env.APP_URL || 'https://zynergia.app';

    const baseParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/landing`,
      ...(email && { customer_email: email }),
      locale: 'es',
      metadata: { plan },
    };

    // ── Split de pago con el socio (Stripe Connect / destination charge) ──
    // La suscripción la cobra la empresa (plataforma). De cada $17:
    //   - application_fee_percent  → lo que retiene la empresa (incluye la comisión de Stripe)
    //   - el resto va al socio (STRIPE_PARTNER_ACCOUNT_ID), limpio, sin fees
    // 82.94% retenido => el socio recibe 17.06% de $17 = $2.90 limpios.
    // IMPORTANTE: si la cuenta del socio aún no completó su onboarding (capability
    // de transfers inactiva), Stripe rechaza la sesión. Para NO perder ventas,
    // intentamos con el split y si falla, cobramos normal sin split.
    const partnerAccount = process.env.STRIPE_PARTNER_ACCOUNT_ID;
    const partnerFeePercent = Number(process.env.STRIPE_PARTNER_FEE_PERCENT || '82.94');

    let session;
    if (partnerAccount) {
      try {
        session = await stripe.checkout.sessions.create({
          ...baseParams,
          subscription_data: {
            application_fee_percent: partnerFeePercent,
            transfer_data: { destination: partnerAccount },
          },
        });
      } catch (splitErr) {
        console.error('[create-checkout] split falló, cobrando sin split:', splitErr.message);
        session = await stripe.checkout.sessions.create(baseParams);
      }
    } else {
      session = await stripe.checkout.sessions.create(baseParams);
    }

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err.message);
    res.status(500).json({ error: 'Error al crear la sesión de pago', detalle: err.message });
  }
}
