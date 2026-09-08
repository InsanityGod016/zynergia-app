import { authenticatedUser } from '../clients.js';
import {
  accessSnapshot,
  claimBillingForUser,
  publicBillingStatus,
} from '../billing-service.js';
import { handleApi } from '../http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'billing-claim' }, async () => {
    const { user } = await authenticatedUser(req, { confirmedEmail: true });
    const result = await claimBillingForUser(user);
    if (result.status === 'conflict') {
      res.status(200).json({ claimed: false, manualReview: true, state: 'manual_review' });
      return;
    }

    const snapshot = await accessSnapshot(user.id);
    res.status(200).json({
      claimed: ['claimed', 'existing'].includes(result.status),
      manualReview: false,
      state: publicBillingStatus(snapshot).state,
    });
  });
}
