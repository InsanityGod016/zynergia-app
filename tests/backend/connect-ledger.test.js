import { describe, expect, test, vi } from 'vitest';

import {
  connectClawbackTarget,
  isEffectiveConnectRefund,
  isFinancialConnectDispute,
  reconcileStripeConnectCharge,
} from '../../api/_lib/connect-ledger.js';

const PARTNER = 'acct_partner123';
const CONNECT_EFFECTIVE_AT = '2026-09-01T06:00:00.000Z';

process.env.STRIPE_CONNECT_EFFECTIVE_AT = CONNECT_EFFECTIVE_AT;
process.env.STRIPE_PARTNER_ACCOUNT_ID = PARTNER;

function refund(amount, status = 'succeeded') {
  return { id: `re_${amount}_${status}`, amount, status, currency: 'usd' };
}

function dispute(amount, status = 'lost', suffix = '') {
  return { id: `dp_${amount}${suffix}`, amount, status, currency: 'usd' };
}

function createHarness({ refunds = [], disputes = [], originalReversed = 0, missingTransfer = false } = {}) {
  let sequence = 0;
  let transferMissing = missingTransfer;
  const idempotency = new Map();
  const stripeTransfers = new Map();
  const ledgerTransfers = new Map();
  let chargeSnapshot;
  const calls = { reversals: [], restorations: [], completed: [], anomalies: [] };

  stripeTransfers.set('tr_original', {
    id: 'tr_original',
    object: 'transfer',
    amount: 340,
    amount_reversed: originalReversed,
    currency: 'usd',
    destination: PARTNER,
    created: 1_700_000_000,
    source_transaction: 'ch_invoice',
    transfer_group: null,
    metadata: {},
    reversals: Array.from({ length: originalReversed > 0 ? 1 : 0 }, () => ({
      id: 'trr_existing',
      amount: originalReversed,
      currency: 'usd',
    })),
  });

  function state() {
    const transfers = [...ledgerTransfers.values()].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'restoration' ? -1 : 1;
      return a.stripe_transfer_id.localeCompare(b.stripe_transfer_id);
    });
    const forward = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    const reversed = transfers.reduce((sum, transfer) => sum + transfer.amount_reversed, 0);
    return {
      charge: chargeSnapshot,
      transfers,
      forward_amount: forward,
      reversed_amount: reversed,
      net_clawback_amount: chargeSnapshot.original_transfer_amount - (forward - reversed),
    };
  }

  const stripe = {
    charges: {
      retrieve: vi.fn(async () => ({
        id: 'ch_invoice',
        object: 'charge',
        amount: 1700,
        currency: 'usd',
        status: 'succeeded',
        transfer: transferMissing ? null : 'tr_original',
        transfer_data: transferMissing ? null : { destination: PARTNER },
      })),
    },
    refunds: {
      list: vi.fn(async () => ({ data: refunds, has_more: false })),
    },
    disputes: {
      list: vi.fn(async () => ({ data: disputes, has_more: false })),
    },
    transfers: {
      retrieve: vi.fn(async (transferId) => stripeTransfers.get(transferId)),
      listReversals: vi.fn(async (transferId) => ({
        data: stripeTransfers.get(transferId).reversals,
        has_more: false,
      })),
      list: vi.fn(async () => ({
        data: [...stripeTransfers.values()].filter((transfer) =>
          transfer.metadata?.zynergia_kind === 'connect_restoration'
        ),
        has_more: false,
      })),
      createReversal: vi.fn(async (transferId, params, options) => {
        if (idempotency.has(options.idempotencyKey)) return idempotency.get(options.idempotencyKey);
        const transfer = stripeTransfers.get(transferId);
        if (params.amount > transfer.amount - transfer.amount_reversed) throw new Error('over reversal');
        const reversal = {
          id: `trr_${++sequence}`,
          amount: params.amount,
          currency: transfer.currency,
        };
        transfer.amount_reversed += params.amount;
        transfer.reversals.push(reversal);
        calls.reversals.push({ transferId, amount: params.amount });
        idempotency.set(options.idempotencyKey, reversal);
        return reversal;
      }),
      create: vi.fn(async (params, options) => {
        if (idempotency.has(options.idempotencyKey)) return idempotency.get(options.idempotencyKey);
        const transfer = {
          id: `tr_restore_${++sequence}`,
          object: 'transfer',
          amount: params.amount,
          amount_reversed: 0,
          currency: params.currency,
          destination: params.destination,
          created: 1_700_000_000 + sequence,
          source_transaction: null,
          transfer_group: params.transfer_group,
          metadata: params.metadata,
          reversals: [],
        };
        stripeTransfers.set(transfer.id, transfer);
        calls.restorations.push(params.amount);
        idempotency.set(options.idempotencyKey, transfer);
        return transfer;
      }),
    },
  };

  const admin = {
    rpc: vi.fn(async (name, params) => {
      if (name === 'sync_stripe_connect_charge_snapshot') {
        chargeSnapshot = {
          original_transfer_amount: params.p_original_transfer_amount,
          desired_clawback_amount: params.p_desired_clawback_amount,
        };
        ledgerTransfers.set(params.p_stripe_original_transfer_id, {
          stripe_transfer_id: params.p_stripe_original_transfer_id,
          kind: 'original',
          amount: params.p_original_transfer_amount,
          amount_reversed: params.p_original_transfer_amount_reversed,
        });
        return { data: { state: state() }, error: null };
      }
      if (name === 'sync_stripe_connect_transfer_snapshot') {
        ledgerTransfers.set(params.p_stripe_transfer_id, {
          stripe_transfer_id: params.p_stripe_transfer_id,
          kind: params.p_kind,
          amount: params.p_amount,
          amount_reversed: params.p_amount_reversed,
        });
        return { data: state(), error: null };
      }
      if (name === 'complete_stripe_connect_reconciliation') {
        calls.completed.push(params.p_net_clawback_amount);
        return { data: state(), error: null };
      }
      if (name === 'record_stripe_connect_anomaly') {
        calls.anomalies.push({ status: 'open', chargeId: params.p_stripe_charge_id });
        return { data: null, error: null };
      }
      if (name === 'resolve_stripe_connect_anomaly') {
        calls.anomalies.push({ status: 'resolved', chargeId: params.p_stripe_charge_id });
        return { data: null, error: null };
      }
      if ([
        'record_stripe_connect_reversal',
        'record_stripe_connect_restoration',
        'fail_stripe_connect_reconciliation',
      ].includes(name)) return { data: null, error: null };
      throw new Error(`RPC inesperado: ${name}`);
    }),
  };

  const target = {
    charge: { id: 'ch_invoice' },
    invoiceId: 'in_invoice',
    paymentIntentId: 'pi_invoice',
    customerId: 'cus_customer',
    subscriptionId: 'sub_subscription',
    subscription: {
      id: 'sub_subscription',
      created: Math.floor(Date.parse(CONNECT_EFFECTIVE_AT) / 1000),
      metadata: {
        zynergia_connect_cohort: 'zynergia_80_20_2026_09_01',
        zynergia_connect_effective_at: CONNECT_EFFECTIVE_AT,
        zynergia_partner_share_percent: '20',
      },
      transfer_data: { destination: PARTNER, amount_percent: 20 },
    },
  };
  const hints = {
    eventId: 'evt_test',
    eventCreatedAt: '2026-08-31T12:00:00.000Z',
  };

  return {
    stripe,
    admin,
    target,
    hints,
    calls,
    refunds,
    disputes,
    makeTransferAvailable() { transferMissing = false; },
  };
}

describe('Connect financial target', () => {
  test('classifies canonical refund and dispute statuses fail-closed', () => {
    expect(isEffectiveConnectRefund('pending')).toBe(true);
    expect(isEffectiveConnectRefund('succeeded')).toBe(true);
    expect(isEffectiveConnectRefund('failed')).toBe(false);
    expect(isFinancialConnectDispute('under_review')).toBe(false);
    expect(isFinancialConnectDispute('lost')).toBe(true);
    expect(isFinancialConnectDispute('won')).toBe(false);
    expect(isFinancialConnectDispute('warning_needs_response')).toBe(false);
    expect(() => isFinancialConnectDispute('future_status')).toThrow(/desconocido/);
  });

  test('caps refund plus dispute overlap at the original partner transfer', () => {
    const result = connectClawbackTarget({
      chargeAmount: 1700,
      originalTransferAmount: 340,
      refunds: [refund(425)],
      disputes: [dispute(1700)],
      currency: 'usd',
    });

    expect(result.effectiveRefundAmount).toBe(425);
    expect(result.financialDisputeAmount).toBe(1700);
    expect(result.exposureAmount).toBe(1700);
    expect(result.desiredClawbackAmount).toBe(340);
  });
});

describe('Connect reconciliation behavior', () => {
  test('leaves an untagged legacy subscription completely outside the Connect ledger', async () => {
    const harness = createHarness();
    const legacyTarget = { ...harness.target, subscription: { metadata: {} } };

    await expect(reconcileStripeConnectCharge(legacyTarget, harness.hints, {
      stripe: harness.stripe,
      admin: harness.admin,
      partnerId: PARTNER,
    })).resolves.toEqual({ status: 'legacy_without_connect', chargeId: 'ch_invoice' });
    expect(harness.stripe.charges.retrieve).not.toHaveBeenCalled();
    expect(harness.admin.rpc).not.toHaveBeenCalled();
  });

  test('persists a missing automatic transfer and resolves it only after canonical reconciliation', async () => {
    const harness = createHarness({ missingTransfer: true });
    const dependencies = { stripe: harness.stripe, admin: harness.admin, partnerId: PARTNER };

    await expect(reconcileStripeConnectCharge(harness.target, harness.hints, dependencies))
      .rejects.toMatchObject({ code: 'CONNECT_TRANSFER_MISSING' });
    expect(harness.calls.anomalies).toEqual([{ status: 'open', chargeId: 'ch_invoice' }]);
    expect(harness.calls.completed).toEqual([]);

    harness.makeTransferAvailable();
    await reconcileStripeConnectCharge(harness.target, {
      eventId: 'evt_charge_updated',
      eventCreatedAt: '2026-09-01T12:00:00.000Z',
    }, dependencies);

    expect(harness.calls.completed.at(-1)).toBe(0);
    expect(harness.calls.anomalies.at(-1)).toEqual({ status: 'resolved', chargeId: 'ch_invoice' });
  });

  test('recognizes Stripe automatic refund reversal and does not claw back twice', async () => {
    const harness = createHarness({ refunds: [refund(425)], originalReversed: 85 });
    await reconcileStripeConnectCharge(harness.target, harness.hints, {
      stripe: harness.stripe,
      admin: harness.admin,
      partnerId: PARTNER,
    });

    expect(harness.calls.reversals).toEqual([]);
    expect(harness.calls.restorations).toEqual([]);
    expect(harness.calls.completed.at(-1)).toBe(85);
  });

  test('creates only the missing partial clawback and duplicate delivery is a no-op', async () => {
    const harness = createHarness({ refunds: [refund(425)] });
    const dependencies = { stripe: harness.stripe, admin: harness.admin, partnerId: PARTNER };
    await reconcileStripeConnectCharge(harness.target, harness.hints, dependencies);
    await reconcileStripeConnectCharge(harness.target, {
      eventId: 'evt_duplicate_object',
      eventCreatedAt: '2026-08-30T12:00:00.000Z',
    }, dependencies);

    expect(harness.calls.reversals).toEqual([{ transferId: 'tr_original', amount: 85 }]);
    expect(harness.calls.completed.at(-1)).toBe(85);
  });

  test('never exceeds the partner share when refund and dispute overlap', async () => {
    const harness = createHarness({ refunds: [refund(425)], disputes: [dispute(1700)] });
    await reconcileStripeConnectCharge(harness.target, harness.hints, {
      stripe: harness.stripe,
      admin: harness.admin,
      partnerId: PARTNER,
    });

    expect(harness.calls.reversals).toEqual([{ transferId: 'tr_original', amount: 340 }]);
    expect(harness.calls.completed.at(-1)).toBe(340);
  });

  test('defers open-dispute clawback for the US to MX cross-border path', async () => {
    const harness = createHarness({ disputes: [dispute(1700, 'needs_response')] });
    await reconcileStripeConnectCharge(harness.target, harness.hints, {
      stripe: harness.stripe,
      admin: harness.admin,
      partnerId: PARTNER,
    });

    expect(harness.calls.reversals).toEqual([]);
    expect(harness.calls.completed.at(-1)).toBe(0);
  });

  test('restores a won dispute, then reverses the restoration first for a later refund', async () => {
    const harness = createHarness({ disputes: [dispute(1700, 'won')], originalReversed: 340 });
    const dependencies = { stripe: harness.stripe, admin: harness.admin, partnerId: PARTNER };
    await reconcileStripeConnectCharge(harness.target, harness.hints, dependencies);
    harness.refunds.push(refund(425));
    await reconcileStripeConnectCharge(harness.target, {
      eventId: 'evt_later_refund',
      eventCreatedAt: '2026-09-01T12:00:00.000Z',
    }, dependencies);

    expect(harness.calls.restorations).toEqual([340]);
    expect(harness.calls.reversals).toContainEqual({ transferId: 'tr_restore_1', amount: 85 });
    expect(harness.calls.completed.at(-1)).toBe(85);
  });

  test('restores partner funds once when a fully reversed refund later fails', async () => {
    const harness = createHarness({ refunds: [refund(1700, 'failed')], originalReversed: 340 });
    await reconcileStripeConnectCharge(harness.target, harness.hints, {
      stripe: harness.stripe,
      admin: harness.admin,
      partnerId: PARTNER,
    });

    expect(harness.calls.restorations).toEqual([340]);
    expect(harness.calls.completed.at(-1)).toBe(0);
  });
});
