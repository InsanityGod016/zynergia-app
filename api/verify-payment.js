import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id || !session_id.startsWith('cs_')) {
    return res.status(400).json({ error: 'session_id inválido' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) {
      return res.status(402).json({ error: 'Pago no completado' });
    }

    const email = session.customer_email || session.customer_details?.email || null;

    res.status(200).json({
      paid: true,
      email,
      plan: session.metadata?.plan || 'monthly',
      session_id: session.id,
    });
  } catch (err) {
    console.error('[verify-payment]', err.message);
    res.status(500).json({ error: 'Error al verificar el pago' });
  }
}
