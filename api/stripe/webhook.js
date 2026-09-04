import { createHash } from 'node:crypto';
import { allowedPriceIds, getStripe, getSupabaseAdmin } from '../_lib/clients.js';
import {
  disputeAccessBlockReason,
  fullRefundBlocksCurrentSubscription,
  invoiceSubscriptionId,
  stripeCustomerId,
  stripePriceId,
} from '../_lib/billing-state.js';
import {
  reconcileStripeAccessIncidentCanonical,
  recordStripeInvoicePaid,
  syncSubscription,
} from '../_lib/billing-service.js';
import { reconcileStripeConnectCharge } from '../_lib/connect-ledger.js';
import { HttpError, readRawBody } from '../_lib/http.js';

export const config = { api: { bodyParser: false } };

async function rpc(name, params) {
  const { data, error } = await getSupabaseAdmin().rpc(name, params);
  if (error) throw error;
  return data;
}

function eventHints(event, extra = {}) {
  return {
    ...extra,
    eventId: event.id,
    eventCreatedAt: new Date(event.created * 1000).toISOString(),
  };
}

function isZynergiaSubscription(subscription) {
  const priceIds = allowedPriceIds();
  if (priceIds.size === 0) throw new Error('No hay precios de Zynergia configurados');
  return subscription?.items?.data?.length === 1 && priceIds.has(stripePriceId(subscription));
}

async function canonicalChargeTarget(chargeId) {
  if (!chargeId?.startsWith('ch_')) throw new Error('El evento no tiene un Charge válido');

  const stripe = getStripe();
  const charge = await stripe.charges.retrieve(chargeId);
  const customerId = stripeCustomerId(charge);
  if (!customerId?.startsWith('cus_')) return null;

  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId?.startsWith('pi_')) return null;

  const invoicePayments = await stripe.invoicePayments.list({
    payment: { type: 'payment_intent', payment_intent: paymentIntentId },
    status: 'paid',
    limit: 2,
  });
  if (invoicePayments.has_more || invoicePayments.data.length > 1) {
    throw new Error('El Charge no se pudo vincular a una sola factura pagada');
  }
  if (invoicePayments.data.length === 0) return null;

  const invoiceRef = invoicePayments.data[0].invoice;
  const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef?.id;
  if (!invoiceId?.startsWith('in_')) throw new Error('Invoice Payment sin factura válida');
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return null;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!isZynergiaSubscription(subscription)) return null;
  if (stripeCustomerId(invoice) !== customerId || stripeCustomerId(subscription) !== customerId) {
    throw new Error('Charge, factura y suscripción pertenecen a Customers distintos');
  }

  const customer = await stripe.customers.retrieve(customerId);
  return {
    charge,
    invoiceId,
    paymentIntentId,
    customerId,
    subscriptionId,
    subscription,
    email: customer.deleted ? null : customer.email,
  };
}

async function recordChargeIncident(target, incident, event) {
  await reconcileStripeAccessIncidentCanonical({
    customerId: target.customerId,
    subscriptionId: target.subscriptionId,
    claimEmail: target.email,
    ...incident,
    ...eventHints(event),
  });
}

async function syncCheckoutSession(sessionId, event) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });
  const subscription = typeof session.subscription === 'string'
    ? await getStripe().subscriptions.retrieve(session.subscription)
    : session.subscription;
  if (!subscription || !isZynergiaSubscription(subscription)) return;

  const email = session.customer_details?.email ||
    (typeof session.customer === 'object' && !session.customer.deleted ? session.customer.email : null);
  await syncSubscription(subscription, {
    userId: session.client_reference_id || session.metadata?.supabase_user_id,
    operationId: session.metadata?.operation_id,
    email,
    ...eventHints(event),
  });
}

async function syncSubscriptionId(subscriptionId, event) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  if (!isZynergiaSubscription(subscription)) return;
  await syncSubscription(subscription, eventHints(event));
}

async function syncInvoice(invoiceId, event) {
  const invoice = await getStripe().invoices.retrieve(invoiceId);
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const customerId = stripeCustomerId(invoice);
  if (!customerId || customerId !== stripeCustomerId(subscription)) {
    throw new Error('La factura y la suscripción no pertenecen al mismo Customer');
  }
  if (!isZynergiaSubscription(subscription)) return;

  await syncSubscription(subscription, eventHints(event));
  if (event.type === 'invoice.paid') {
    await recordStripeInvoicePaid({ customerId, subscriptionId, ...eventHints(event) });
  }

  if (!['invoice.paid', 'invoice.payment_succeeded'].includes(event.type)) return;
  const invoicePayments = await getStripe().invoicePayments.list({
    invoice: invoice.id,
    status: 'paid',
    limit: 100,
  });
  if (invoicePayments.has_more) throw new Error('La factura tiene demasiados pagos para conciliar');

  const chargeIds = new Set();
  for (const invoicePayment of invoicePayments.data) {
    if (invoicePayment.payment?.type === 'charge') {
      chargeIds.add(typeof invoicePayment.payment.charge === 'string'
        ? invoicePayment.payment.charge
        : invoicePayment.payment.charge?.id);
      continue;
    }
    if (invoicePayment.payment?.type === 'payment_intent') {
      const paymentIntentId = typeof invoicePayment.payment.payment_intent === 'string'
        ? invoicePayment.payment.payment_intent
        : invoicePayment.payment.payment_intent?.id;
      if (!paymentIntentId?.startsWith('pi_')) throw new Error('Invoice Payment sin PaymentIntent válido');
      const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      chargeIds.add(typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id);
      continue;
    }
    throw new Error('La factura usa un tipo de pago que Connect todavía no puede conciliar');
  }

  for (const chargeId of chargeIds) {
    if (!chargeId?.startsWith('ch_')) throw new Error('La factura pagada no tiene un Charge válido');
    const target = await canonicalChargeTarget(chargeId);
    await reconcileStripeConnectCharge(target, eventHints(event));
  }
}

async function processRefund(event) {
  let chargeId = event.data.object.id;
  if (event.data.object.object === 'refund' || chargeId?.startsWith('re_')) {
    const refund = await getStripe().refunds.retrieve(chargeId);
    chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
  }
  const target = await canonicalChargeTarget(chargeId);
  if (!target) return;
  await syncSubscription(target.subscription, eventHints(event, { email: target.email }));

  await recordChargeIncident(target, {
    incidentKey: `charge:${target.charge.id}`,
    incidentKind: 'full_refund',
    blockedReason: fullRefundBlocksCurrentSubscription(
      target.charge,
      target.subscription,
      target.invoiceId,
    ) ? 'full_refund' : null,
  }, event);
  await reconcileStripeConnectCharge(target, eventHints(event));
}

async function processDispute(event) {
  const dispute = await getStripe().disputes.retrieve(event.data.object.id);
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  const target = await canonicalChargeTarget(chargeId);
  if (!target) return;
  const blockedReason = disputeAccessBlockReason(dispute.status);

  await syncSubscription(target.subscription, eventHints(event, { email: target.email }));
  await recordChargeIncident(target, {
    incidentKey: `dispute:${dispute.id}`,
    incidentKind: 'dispute',
    blockedReason,
  }, event);
  await reconcileStripeConnectCharge(target, eventHints(event));
}

async function processCharge(event) {
  const target = await canonicalChargeTarget(event.data.object.id);
  if (!target) return;
  await reconcileStripeConnectCharge(target, eventHints(event));
}

async function processTransfer(event) {
  const transfer = await getStripe().transfers.retrieve(event.data.object.id);
  const chargeId = typeof transfer.source_transaction === 'string'
    ? transfer.source_transaction
    : transfer.source_transaction?.id || transfer.metadata?.zynergia_charge_id;
  if (!chargeId?.startsWith('ch_')) return;
  const target = await canonicalChargeTarget(chargeId);
  if (!target) return;
  await reconcileStripeConnectCharge(target, eventHints(event));
}

export async function processEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed':
      await syncCheckoutSession(event.data.object.id, event);
      return;

    case 'invoice.paid':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      await syncInvoice(event.data.object.id, event);
      return;

    case 'charge.refunded':
    case 'charge.refund.updated':
    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed':
      await processRefund(event);
      return;

    case 'charge.dispute.created':
    case 'charge.dispute.updated':
    case 'charge.dispute.closed':
    case 'charge.dispute.funds_withdrawn':
    case 'charge.dispute.funds_reinstated':
      await processDispute(event);
      return;

    case 'charge.succeeded':
    case 'charge.updated':
      await processCharge(event);
      return;

    case 'transfer.created':
    case 'transfer.updated':
    case 'transfer.reversed':
      await processTransfer(event);
      return;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscriptionId(event.data.object.id, event);
      return;

    case 'customer.subscription.deleted':
      if (isZynergiaSubscription(event.data.object)) {
        await syncSubscription(event.data.object, eventHints(event));
      }
      return;

    default:
      return;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método no permitido', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  let event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(500, 'SERVER_NOT_CONFIGURED', 'Falta configurar el webhook.');
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    if (!signature) throw new HttpError(400, 'MISSING_SIGNATURE', 'Falta la firma de Stripe.');
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);

    const shouldProcess = await rpc('claim_stripe_webhook_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created_at: new Date(event.created * 1000).toISOString(),
      p_payload_sha256: createHash('sha256').update(rawBody).digest('hex'),
    });
    if (!shouldProcess) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    await processEvent(event);
    await rpc('complete_stripe_webhook_event', { p_event_id: event.id });
    res.status(200).json({ received: true });
  } catch (error) {
    if (event?.id) {
      await rpc('fail_stripe_webhook_event', {
        p_event_id: event.id,
        p_last_error: String(error?.message || error).slice(0, 500),
      }).catch(() => {});
    }

    const status = error instanceof HttpError ? error.status : event ? 500 : 400;
    const code = error instanceof HttpError
      ? error.code
      : event
        ? 'WEBHOOK_PROCESSING_FAILED'
        : 'INVALID_WEBHOOK_SIGNATURE';
    console.error('[stripe-webhook]', error);
    res.status(status).json({ error: 'No se pudo procesar el webhook.', code });
  }
}
