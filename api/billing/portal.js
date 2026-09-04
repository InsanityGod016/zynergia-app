import { authenticatedUser, appUrl, getStripe } from '../_lib/clients.js';
import {
  accessSnapshot,
  billingConflict,
  claimBillingForUser,
} from '../_lib/billing-service.js';
import { handleApi, HttpError } from '../_lib/http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'billing-portal' }, async () => {
    const { user } = await authenticatedUser(req, { confirmedEmail: true });
    const claim = await claimBillingForUser(user);
    if (claim.status === 'conflict') billingConflict(claim);
    const snapshot = await accessSnapshot(user.id);
    if (snapshot?.deletion_scheduled_for) {
      throw new HttpError(409, 'ACCOUNT_DELETION_PENDING', 'Tu cuenta tiene una eliminación programada.');
    }
    const customerId = snapshot?.billing?.stripe_customer_id;
    if (!customerId) {
      throw new HttpError(409, 'NO_BILLING_ACCOUNT', 'Tu cuenta todavía no tiene facturación asociada.');
    }

    const returnUrl = appUrl(process.env.PORTAL_RETURN_PATH || '/cuenta');
    const params = {
      customer: customerId,
      return_url: returnUrl,
      locale: 'es-419',
      flow_data: {
        type: 'payment_method_update',
        after_completion: {
          type: 'redirect',
          redirect: { return_url: returnUrl },
        },
      },
    };
    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
      params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    }

    const session = await getStripe().billingPortal.sessions.create(params);
    res.status(200).json({ url: session.url });
  });
}
