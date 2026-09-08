import { timingSafeEqual } from 'node:crypto';

import { getSupabaseAdmin } from '../_lib/clients.js';
import { handleApi, HttpError } from '../_lib/http.js';
import { isRetryableOneSignalError, sendOneSignalPush } from '../_lib/onesignal.js';

function requireCronSecret(req) {
  const expected = String(process.env.CRON_SECRET || '');
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

async function runWorkers(items, concurrency, worker) {
  let cursor = 0;
  const next = async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['GET', 'POST'], label: 'process-push-notifications' }, async () => {
    requireCronSecret(req);
    const admin = getSupabaseAdmin();
    await rpc(admin, 'enqueue_due_daily_summaries', { p_now: new Date().toISOString() });
    const pending = await rpc(admin, 'claim_push_notifications', { p_limit: 20 });
    const result = { sent: 0, skipped: 0, retrying: 0, failed: 0 };

    await runWorkers(pending || [], 5, async notification => {
      let delivery;
      try {
        delivery = await sendOneSignalPush({
          notificationId: notification.notification_id,
          userId: notification.user_id,
          title: notification.title,
          body: notification.body,
          route: notification.route,
        });
      } catch (error) {
        const retryable = isRetryableOneSignalError(error);
        const errorCode = String(error?.message || 'provider_error').slice(0, 110);
        const status = await rpc(admin, 'finish_push_notification', {
          p_notification_id: notification.notification_id,
          p_attempt_count: notification.attempt_count,
          p_sent: false,
          p_provider_message_id: null,
          p_error_code: retryable ? `retryable:${errorCode}` : errorCode,
        }).catch(() => null);
        if (status === 'pending') result.retrying += 1;
        else result.failed += 1;
        return;
      }

      try {
        const status = await rpc(admin, 'finish_push_notification', {
          p_notification_id: notification.notification_id,
          p_attempt_count: notification.attempt_count,
          p_sent: delivery.sent,
          p_provider_message_id: delivery.providerMessageId || null,
          p_error_code: delivery.errorCode || null,
        });
        if (status === 'sent') result.sent += 1;
        else if (status === 'skipped') result.skipped += 1;
      } catch {
        // The provider may already have accepted the push. Leave the lease in
        // place; reclaiming it with the same idempotency key is safe.
        result.failed += 1;
      }
    });

    res.status(result.failed ? 500 : 200).json(result);
  });
}
