import { beforeEach, expect, test, vi } from 'vitest';

const stripe = vi.hoisted(() => ({
  cancel: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  deleteCustomer: vi.fn(),
}));

vi.mock('../../api/_lib/clients.js', () => ({
  allowedPriceIds: () => new Set(['price_zynergia']),
  getStripe: () => ({
    subscriptions: {
      cancel: stripe.cancel,
      list: stripe.list,
      retrieve: stripe.retrieve,
      update: stripe.update,
    },
    customers: { del: stripe.deleteCustomer },
  }),
}));

import {
  executeAccountDeletion,
  scheduleBillingDeletion,
} from '../../api/_lib/account-deletion.js';

const subscription = {
  id: 'sub_zynergia',
  customer: 'cus_shared',
  status: 'active',
  cancel_at_period_end: false,
  items: { data: [{ price: { id: 'price_zynergia' } }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  stripe.retrieve.mockResolvedValue(subscription);
  stripe.update.mockResolvedValue({ ...subscription, cancel_at_period_end: true });
  stripe.cancel.mockResolvedValue({ ...subscription, status: 'canceled' });
});

test('scheduled deletion touches only the recorded Zynergia subscription', async () => {
  await scheduleBillingDeletion({
    customerId: 'cus_shared',
    subscriptionId: 'sub_zynergia',
    operationId: 'operation',
  });

  expect(stripe.retrieve).toHaveBeenCalledWith('sub_zynergia');
  expect(stripe.update).toHaveBeenCalledWith(
    'sub_zynergia',
    { cancel_at_period_end: true },
    { idempotencyKey: 'schedule-delete:operation:sub_zynergia' },
  );
  expect(stripe.list).not.toHaveBeenCalled();
  expect(stripe.deleteCustomer).not.toHaveBeenCalled();
});

test('immediate deletion preserves the shared Stripe Customer and other products', async () => {
  const admin = {
    rpc: vi.fn(async () => ({ data: null, error: null })),
    auth: { admin: { deleteUser: vi.fn(async () => ({ error: null })) } },
  };

  await executeAccountDeletion(admin, {
    request_id: 'request',
    operation_id: 'operation',
    user_id: 'user',
    stripe_customer_id: 'cus_shared',
    stripe_subscription_id: 'sub_zynergia',
  });

  expect(stripe.cancel).toHaveBeenCalledWith(
    'sub_zynergia',
    {},
    { idempotencyKey: 'delete:operation:sub_zynergia' },
  );
  expect(stripe.list).not.toHaveBeenCalled();
  expect(stripe.deleteCustomer).not.toHaveBeenCalled();
  expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('user');
});

test('refuses to cancel a subscription from another product or Customer', async () => {
  stripe.retrieve.mockResolvedValueOnce({
    ...subscription,
    items: { data: [{ price: { id: 'price_other_product' } }] },
  });
  await expect(scheduleBillingDeletion({
    customerId: 'cus_shared',
    subscriptionId: 'sub_other',
    operationId: 'operation',
  })).rejects.toThrow('billing_subscription_price_mismatch');

  stripe.retrieve.mockResolvedValueOnce({ ...subscription, customer: 'cus_other' });
  await expect(scheduleBillingDeletion({
    customerId: 'cus_shared',
    subscriptionId: 'sub_zynergia',
    operationId: 'operation',
  })).rejects.toThrow('billing_subscription_customer_mismatch');

  expect(stripe.update).not.toHaveBeenCalled();
  expect(stripe.cancel).not.toHaveBeenCalled();
});

test('fails closed when a Stripe Customer exists without a recorded subscription', async () => {
  await expect(scheduleBillingDeletion({
    customerId: 'cus_shared',
    subscriptionId: null,
    operationId: 'operation',
  })).rejects.toThrow('billing_subscription_required_for_customer');

  const admin = {
    rpc: vi.fn(async () => ({ data: null, error: null })),
    auth: { admin: { deleteUser: vi.fn(async () => ({ error: null })) } },
  };
  await expect(executeAccountDeletion(admin, {
    request_id: 'request',
    operation_id: 'operation',
    user_id: 'user',
    stripe_customer_id: 'cus_shared',
    stripe_subscription_id: null,
  })).rejects.toThrow('billing_subscription_required_for_customer');

  expect(stripe.retrieve).not.toHaveBeenCalled();
  expect(stripe.cancel).not.toHaveBeenCalled();
  expect(admin.rpc).not.toHaveBeenCalled();
  expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
});
