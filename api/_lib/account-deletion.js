import { allowedPriceIds, getStripe } from './clients.js';
import { stripeCustomerId, stripePriceId } from './billing-state.js';

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete_expired']);

function isMissingStripeResource(error) {
  return error?.code === 'resource_missing' || error?.statusCode === 404;
}

async function retrieveOwnedZynergiaSubscription({ customerId, subscriptionId }) {
  if (!subscriptionId) {
    if (customerId) throw new Error('billing_subscription_required_for_customer');
    return null;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const prices = allowedPriceIds();
  if (customerId && stripeCustomerId(subscription) !== customerId) {
    throw new Error('billing_subscription_customer_mismatch');
  }
  if (subscription.items?.data?.length !== 1 || !prices.has(stripePriceId(subscription))) {
    throw new Error('billing_subscription_price_mismatch');
  }
  return subscription;
}

async function rpc(admin, name, params) {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw error;
  return data;
}

export async function scheduleBillingDeletion({ customerId, subscriptionId, operationId }) {
  const stripe = getStripe();
  let subscription;
  try {
    subscription = await retrieveOwnedZynergiaSubscription({ customerId, subscriptionId });
  } catch (error) {
    if (isMissingStripeResource(error)) return;
    throw error;
  }
  if (!subscription) return;

  if (!TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status) && !subscription.cancel_at_period_end) {
    await stripe.subscriptions.update(
      subscription.id,
      { cancel_at_period_end: true },
      { idempotencyKey: `schedule-delete:${operationId}:${subscription.id}` }
    );
  }
}

async function cancelBillingNow({ customerId, subscriptionId, operationId }) {
  const stripe = getStripe();
  let subscription;
  try {
    subscription = await retrieveOwnedZynergiaSubscription({ customerId, subscriptionId });
  } catch (error) {
    if (isMissingStripeResource(error)) return;
    throw error;
  }
  if (!subscription) return;

  if (!TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    try {
      await stripe.subscriptions.cancel(
        subscription.id,
        {},
        { idempotencyKey: `delete:${operationId}:${subscription.id}` }
      );
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  }
}

export async function executeAccountDeletion(admin, request) {
  await cancelBillingNow({
    customerId: request.stripe_customer_id,
    subscriptionId: request.stripe_subscription_id,
    operationId: request.operation_id,
  });

  if (request.user_id) {
    await rpc(admin, 'delete_user_data', {
      p_request_id: request.request_id,
      p_user_id: request.user_id,
    });

    const { error } = await admin.auth.admin.deleteUser(request.user_id);
    if (error) throw error;
  }

  await rpc(admin, 'complete_account_deletion', { p_request_id: request.request_id });
}
