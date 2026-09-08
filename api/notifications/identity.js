import { authenticatedUser } from '../_lib/clients.js';
import { handleApi } from '../_lib/http.js';
import { oneSignalExternalId } from '../_lib/onesignal.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['GET'], label: 'push-identity' }, async () => {
    const { user } = await authenticatedUser(req);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ externalId: oneSignalExternalId(user.id) });
  });
}
