import { executeAccountDeletion, scheduleBillingDeletion } from '../_lib/account-deletion.js';
import {
  accessSnapshot,
  billingConflict,
  claimBillingForUser,
  refreshSubscription,
} from '../_lib/billing-service.js';
import { authenticatedUser, requireFreshToken } from '../_lib/clients.js';
import { handleApi, HttpError, isOperationId, readJson } from '../_lib/http.js';

async function rpc(admin, name, params) {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ['POST'], label: 'account-deletion-request' }, async () => {
    const { admin, token, user } = await authenticatedUser(req);
    requireFreshToken(token);

    const body = await readJson(req);
    if (body.confirmation !== 'DELETE') {
      throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Escribe DELETE para confirmar la eliminación.');
    }
    if (body.delete_now !== undefined && typeof body.delete_now !== 'boolean') {
      throw new HttpError(400, 'INVALID_DELETE_MODE', 'delete_now debe ser booleano.');
    }
    const deleteNow = body.delete_now === true;
    if (!isOperationId(body.operation_id)) {
      throw new HttpError(400, 'INVALID_OPERATION_ID', 'Envía un operation_id UUID para continuar.');
    }

    if (user.email && (user.email_confirmed_at || user.confirmed_at)) {
      const claim = await claimBillingForUser(user);
      if (claim.status === 'conflict') billingConflict(claim);
    }

    const snapshot = await accessSnapshot(user.id);
    if (snapshot?.billing?.stripe_subscription_id) {
      await refreshSubscription(snapshot.billing.stripe_subscription_id, { userId: user.id });
    }

    const request = await rpc(admin, 'begin_account_deletion', {
      p_user_id: user.id,
      p_operation_id: body.operation_id,
    });

    if (request.already_processing) {
      res.status(202).json({ status: 'processing', executeAt: null });
      return;
    }

    if (request.should_schedule && !deleteNow) {
      try {
        await scheduleBillingDeletion({
          customerId: request.stripe_customer_id,
          subscriptionId: request.stripe_subscription_id,
          operationId: request.operation_id,
        });
        await rpc(admin, 'schedule_account_deletion', {
          p_request_id: request.request_id,
          p_execute_at: request.execute_at,
        });
      } catch (error) {
        await rpc(admin, 'fail_account_deletion', {
          p_request_id: request.request_id,
          p_failure_code: 'billing_schedule_failed',
        }).catch(() => {});
        throw new HttpError(502, 'BILLING_SCHEDULE_FAILED', 'No pudimos programar la cancelación. Intenta de nuevo.');
      }

      res.status(200).json({ status: 'scheduled', executeAt: request.execute_at });
      return;
    }

    try {
      const executeAt = new Date().toISOString();
      await rpc(admin, 'schedule_account_deletion', {
        p_request_id: request.request_id,
        p_execute_at: executeAt,
      });
      await executeAccountDeletion(admin, {
        ...request,
        user_id: user.id,
        execute_at: executeAt,
      });
    } catch (error) {
      await rpc(admin, 'fail_account_deletion', {
        p_request_id: request.request_id,
        p_failure_code: 'immediate_delete_failed',
      }).catch(() => {});
      throw error;
    }

    res.status(200).json({ status: 'completed', executeAt: null });
  });
}
