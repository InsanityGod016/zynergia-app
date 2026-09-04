import { authenticatedUser } from '../_lib/clients.js';
import {
  accessSnapshot,
  billingConflict,
  cancelSubscriptionAtPeriodEnd,
  claimBillingForUser,
  publicBillingStatus,
} from '../_lib/billing-service.js';
import { handleApi, HttpError } from '../_lib/http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'billing-cancel' }, async () => {
    const { user } = await authenticatedUser(req, { confirmedEmail: true });
    const claim = await claimBillingForUser(user);
    if (claim.status === 'conflict') billingConflict(claim);

    const snapshot = await accessSnapshot(user.id);
    const customerId = snapshot?.billing?.stripe_customer_id;
    const subscriptionId = snapshot?.billing?.stripe_subscription_id;
    if (!customerId || !subscriptionId) {
      throw new HttpError(409, 'NO_ACTIVE_SUBSCRIPTION', 'Tu cuenta no tiene una suscripción que podamos cancelar.');
    }

    await cancelSubscriptionAtPeriodEnd({ userId: user.id, customerId, subscriptionId });
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(publicBillingStatus(await accessSnapshot(user.id)));
  });
}
