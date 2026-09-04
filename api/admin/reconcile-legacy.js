import {
  reconcileLegacySubscriptions,
  requireLegacyReconciliationAdmin,
} from '../_lib/legacy-reconciliation.js';
import { handleApi } from '../_lib/http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'legacy-reconciliation' }, async () => {
    requireLegacyReconciliationAdmin(req);
    const summary = await reconcileLegacySubscriptions();
    const complete = summary.failed === 0 &&
      summary.reconciled === summary.eligible &&
      !summary.reasons.not_exact_single_allowed_price;
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(summary.failed > 0 ? 500 : 200).json({
      complete,
      ...summary,
    });
  });
}
