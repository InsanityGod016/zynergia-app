import { authenticatedUser } from '../clients.js';
import { accessSnapshot, publicBillingStatus } from '../billing-service.js';
import { handleApi } from '../http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['GET'], label: 'billing-status' }, async () => {
    const { user } = await authenticatedUser(req);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(publicBillingStatus(await accessSnapshot(user.id)));
  });
}
