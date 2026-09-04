import { newSignupsEnabled, validatedPriceForPlan } from '../_lib/clients.js';
import { connectCohortMetadata, partnerTransferData } from '../_lib/connect.js';
import { handleApi } from '../_lib/http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['GET'], label: 'signup-status' }, async () => {
    let enabled = false;
    if (newSignupsEnabled()) {
      try {
        await validatedPriceForPlan('monthly');
        connectCohortMetadata();
        await partnerTransferData();
        enabled = true;
      } catch {
        // Public callers only need to know whether the complete purchase path is ready.
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ enabled });
  });
}
