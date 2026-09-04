import {
  authenticatedUser,
  appUrl,
  getStripe,
  newSignupsEnabled,
  validatedPriceForPlan,
} from '../_lib/clients.js';
import {
  accessSnapshot,
  billingConflict,
  claimBillingForUser,
  ensureStripeCustomer,
  refreshSubscription,
  reserveCheckoutOperation,
} from '../_lib/billing-service.js';
import { isNonTerminalSubscription } from '../_lib/billing-state.js';
import { connectCohortMetadata, partnerTransferData } from '../_lib/connect.js';
import { handleApi, HttpError, isOperationId, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'billing-checkout' }, async () => {
    const { user } = await authenticatedUser(req, { confirmedEmail: true });
    const body = await readJson(req);
    const operationId = body.operation_id || req.headers?.['idempotency-key'];
    if (!isOperationId(operationId)) {
      throw new HttpError(400, 'INVALID_OPERATION_ID', 'Envía un operation_id UUID para evitar cobros duplicados.');
    }
    if (!newSignupsEnabled()) {
      throw new HttpError(503, 'NEW_SIGNUPS_DISABLED', 'Las nuevas altas están temporalmente pausadas.');
    }
    const plan = body.plan || 'monthly';
    const priceId = await validatedPriceForPlan(plan);
    const connectMetadata = connectCohortMetadata();
    const transferData = await partnerTransferData();

    const claim = await claimBillingForUser(user);
    if (claim.status === 'conflict') billingConflict(claim);

    let snapshot = await accessSnapshot(user.id);
    if (snapshot?.deletion_scheduled_for) {
      throw new HttpError(409, 'ACCOUNT_DELETION_PENDING', 'Tu cuenta tiene una eliminación programada.');
    }
    if (snapshot?.billing?.stripe_subscription_id) {
      await refreshSubscription(snapshot.billing.stripe_subscription_id, { userId: user.id });
      snapshot = await accessSnapshot(user.id);
    }

    if (snapshot?.access?.entitled) {
      throw new HttpError(409, 'ALREADY_ENTITLED', 'Tu suscripción ya está activa.');
    }

    if (isNonTerminalSubscription(snapshot?.billing?.subscription_status)) {
      throw new HttpError(
        409,
        'EXISTING_SUBSCRIPTION_REQUIRES_ACTION',
        'Tu suscripción existente requiere una acción de facturación.'
      );
    }

    const customerId = await ensureStripeCustomer(user, snapshot?.billing);
    const reservation = await reserveCheckoutOperation(user.id, operationId);
    if (reservation?.status === 'conflict') {
      throw new HttpError(
        409,
        'CHECKOUT_IN_PROGRESS',
        'Ya hay un proceso de pago en curso. Reutiliza ese enlace o espera hasta 24 horas.'
      );
    }
    const successPath = process.env.CHECKOUT_SUCCESS_PATH || '/pago/exito';
    const cancelPath = process.env.CHECKOUT_CANCEL_PATH || '/cuenta';
    const metadata = {
      supabase_user_id: user.id,
      operation_id: operationId,
      plan,
      ...connectMetadata,
    };

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl(successPath),
      cancel_url: appUrl(cancelPath),
      locale: 'es',
      metadata,
      subscription_data: {
        metadata,
        transfer_data: transferData,
      },
    }, { idempotencyKey: `checkout:${user.id}:${operationId}` });

    res.status(200).json({ url: session.url });
  });
}
