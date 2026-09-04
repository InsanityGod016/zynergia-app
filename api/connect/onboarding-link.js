import { appUrl, getStripe } from '../_lib/clients.js';
import { requireConnectAdmin, retrievePartnerAccount } from '../_lib/connect.js';
import { handleApi } from '../_lib/http.js';

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'connect-onboarding-link' }, async () => {
    requireConnectAdmin(req);
    const account = await retrievePartnerAccount();
    const link = await getStripe().accountLinks.create({
      account: account.id,
      collection_options: {
        fields: 'eventually_due',
        future_requirements: 'include',
      },
      refresh_url: appUrl('/soporte?connect=onboarding-expired'),
      return_url: appUrl('/?connect=onboarding-returned'),
      type: 'account_onboarding',
    });

    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json({ url: link.url, expiresAt: link.expires_at });
  });
}
