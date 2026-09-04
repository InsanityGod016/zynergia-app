import { timingSafeEqual } from 'node:crypto';

import { executeAccountDeletion, scheduleBillingDeletion } from '../_lib/account-deletion.js';
import { getSupabaseAdmin } from '../_lib/clients.js';
import { handleApi, HttpError } from '../_lib/http.js';

function requireCronSecret(req) {
  const expected = process.env.CRON_SECRET;
  const provided = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected) throw new HttpError(500, 'SERVER_NOT_CONFIGURED', 'Falta configurar CRON_SECRET.');

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    throw new HttpError(401, 'INVALID_CRON_SECRET', 'No autorizado.');
  }
}

async function rpc(admin, name, params) {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['GET', 'POST'], label: 'process-deletions' }, async () => {
    requireCronSecret(req);
    const admin = getSupabaseAdmin();
    const requests = await rpc(admin, 'claim_due_account_deletions', { p_limit: 25 });
    const result = { scheduled: 0, completed: 0, failed: 0 };

    for (const request of requests || []) {
      try {
        if (request.mode === 'schedule') {
          await scheduleBillingDeletion({
            customerId: request.stripe_customer_id,
            subscriptionId: request.stripe_subscription_id,
            operationId: request.operation_id,
          });
          await rpc(admin, 'schedule_account_deletion', {
            p_request_id: request.request_id,
            p_execute_at: request.execute_at,
          });
          result.scheduled += 1;
        } else {
          await executeAccountDeletion(admin, request);
          result.completed += 1;
        }
      } catch (error) {
        console.error('[process-deletions:item]', request.request_id, error);
        await rpc(admin, 'fail_account_deletion', {
          p_request_id: request.request_id,
          p_failure_code: request.mode === 'schedule' ? 'billing_schedule_failed' : 'scheduled_delete_failed',
        }).catch(() => {});
        result.failed += 1;
      }
    }

    res.status(result.failed > 0 ? 500 : 200).json(result);
  });
}
