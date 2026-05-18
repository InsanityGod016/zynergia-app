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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/landing`,
      ...(email && { customer_email: email }),
      locale: 'es',
      metadata: { plan },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err.message);
    res.status(500).json({ error: 'Error al crear la sesión de pago' });
  }
}
