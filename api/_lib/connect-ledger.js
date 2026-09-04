import { createHash } from 'node:crypto';

import { getStripe, getSupabaseAdmin } from './clients.js';
import { partnerAccountId, subscriptionUsesConnectCohort } from './connect.js';

const EFFECTIVE_REFUND_STATUSES = new Set(['pending', 'requires_action', 'succeeded']);
const TERMINAL_REFUND_STATUSES = new Set(['failed', 'canceled']);
// CoreFlowAI (US) -> partner (MX) can be restricted from reversing an open
// cross-border transfer. Access is blocked immediately by the webhook, while
// the partner clawback is intentionally deferred until Stripe reports `lost`.
const FINANCIAL_DISPUTE_STATUSES = new Set(['lost']);
const NON_FINANCIAL_DISPUTE_STATUSES = new Set([
  'needs_response',
  'under_review',
  'warning_needs_response',
  'warning_under_review',
  'warning_closed',
  'won',
  'prevented',
]);

class MissingConnectTransferError extends Error {
  constructor(chargeId) {
    super('El Charge de la cohorte Connect no tiene el Transfer automático esperado');
    this.code = 'CONNECT_TRANSFER_MISSING';
    this.chargeId = chargeId;
  }
}

function integer(value, label, { positive = false } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || (positive ? number <= 0 : number < 0)) {
    throw new Error(`Stripe devolvió ${label} inválido`);
  }
  return number;
}

function id(value, prefix, label) {
  const candidate = typeof value === 'string' ? value : value?.id;
  if (!candidate?.startsWith(prefix)) throw new Error(`Stripe devolvió ${label} inválido`);
  return candidate;
}

function disputeId(value) {
  if (typeof value !== 'string' || !/^(dp_|du_)[A-Za-z0-9]+$/.test(value)) {
    throw new Error('Stripe devolvió dispute.id inválido');
  }
  return value;
}

function isoFromUnix(seconds, label) {
  const value = integer(seconds, label, { positive: true });
  return new Date(value * 1000).toISOString();
}

function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function rpc(admin, name, params) {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw error;
  return data;
}

function assertSinglePage(page, label) {
  if (page?.has_more) throw new Error(`${label} excede el límite seguro de conciliación`);
  return Array.isArray(page?.data) ? page.data : [];
}

export function isEffectiveConnectRefund(status) {
  if (EFFECTIVE_REFUND_STATUSES.has(status)) return true;
  if (TERMINAL_REFUND_STATUSES.has(status)) return false;
  throw new Error(`Estado de refund desconocido: ${status || 'vacío'}`);
}

export function isFinancialConnectDispute(status) {
  if (FINANCIAL_DISPUTE_STATUSES.has(status)) return true;
  if (NON_FINANCIAL_DISPUTE_STATUSES.has(status)) return false;
  throw new Error(`Estado de disputa desconocido: ${status || 'vacío'}`);
}

export function connectClawbackTarget({
  chargeAmount,
  originalTransferAmount,
  refunds = [],
  disputes = [],
  currency,
}) {
  const charge = integer(chargeAmount, 'charge.amount', { positive: true });
  const transfer = integer(originalTransferAmount, 'transfer.amount', { positive: true });
  if (transfer > charge) throw new Error('El Transfer del socio excede el Charge');
  if (!/^[a-z]{3}$/.test(currency || '')) throw new Error('Moneda del Charge inválida');

  let effectiveRefundAmount = 0;
  for (const refund of refunds) {
    if (refund.currency !== currency) throw new Error('Refund y Charge tienen monedas distintas');
    const amount = integer(refund.amount, 'refund.amount', { positive: true });
    if (isEffectiveConnectRefund(refund.status)) effectiveRefundAmount += amount;
  }
  if (effectiveRefundAmount > charge) throw new Error('Los refunds vigentes exceden el Charge');

  let disputeTotal = 0;
  const canonicalDisputes = disputes.map((dispute) => {
    if (dispute.currency !== currency) throw new Error('Disputa y Charge tienen monedas distintas');
    const amount = integer(dispute.amount, 'dispute.amount', { positive: true });
    const financiallyBlocking = isFinancialConnectDispute(dispute.status);
    if (financiallyBlocking) disputeTotal += amount;
    return {
      id: disputeId(dispute.id),
      amount,
      currency,
      status: dispute.status,
      financially_blocking: financiallyBlocking,
    };
  });

  const financialDisputeAmount = Math.min(charge, disputeTotal);
  const exposureAmount = Math.min(charge, effectiveRefundAmount + financialDisputeAmount);
  const desiredClawbackAmount = Math.round(transfer * exposureAmount / charge);

  return {
    effectiveRefundAmount,
    financialDisputeAmount,
    exposureAmount,
    desiredClawbackAmount,
    disputes: canonicalDisputes,
  };
}

function destinationId(transfer) {
  return id(transfer?.destination, 'acct_', 'transfer.destination');
}

function transferSnapshot(transfer, kind, reversals) {
  const amount = integer(transfer.amount, 'transfer.amount', { positive: true });
  const amountReversed = integer(transfer.amount_reversed, 'transfer.amount_reversed');
  if (amountReversed > amount) throw new Error('El Transfer tiene una reversión imposible');

  return {
    id: id(transfer.id, 'tr_', 'transfer.id'),
    kind,
    amount,
    amountReversed,
    currency: transfer.currency,
    destination: destinationId(transfer),
    createdAt: isoFromUnix(transfer.created, 'transfer.created'),
    reversals: reversals.map((reversal) => ({
      id: id(reversal.id, 'trr_', 'transfer_reversal.id'),
      amount: integer(reversal.amount, 'transfer_reversal.amount', { positive: true }),
      currency: reversal.currency,
    })),
    sourceTransaction: typeof transfer.source_transaction === 'string'
      ? transfer.source_transaction
      : transfer.source_transaction?.id || null,
  };
}

function stateNumber(state, key) {
  return integer(state?.[key], `ledger.${key}`);
}

function stateTransfers(state) {
  if (!Array.isArray(state?.transfers)) throw new Error('El ledger no devolvió sus Transfers');
  return state.transfers.map((transfer) => ({
    id: id(transfer.stripe_transfer_id, 'tr_', 'ledger transfer'),
    kind: transfer.kind,
    amount: integer(transfer.amount, 'ledger transfer.amount', { positive: true }),
    amountReversed: integer(transfer.amount_reversed, 'ledger transfer.amount_reversed'),
  }));
}

function operationKey(kind, chargeId, desired, transfers, sourceTransferId = null) {
  const fingerprint = stableHash({ desired, sourceTransferId, transfers });
  return `connect:${kind}:${chargeId}:${fingerprint}`;
}

async function loadTransfer(stripe, transferId, kind) {
  const transfer = await stripe.transfers.retrieve(transferId);
  const reversalsPage = await stripe.transfers.listReversals(transferId, { limit: 100 });
  const reversals = assertSinglePage(reversalsPage, `Las reversiones de ${transferId}`);
  const sum = reversals.reduce(
    (total, reversal) => total + integer(reversal.amount, 'transfer_reversal.amount', { positive: true }),
    0
  );
  if (sum !== integer(transfer.amount_reversed, 'transfer.amount_reversed')) {
    throw new Error('Stripe devolvió un Transfer sin todas sus reversiones');
  }
  return transferSnapshot(transfer, kind, reversals);
}

async function loadCanonicalSnapshot(target, stripe, configuredPartner) {
  const chargeId = id(target?.charge?.id || target?.chargeId, 'ch_', 'charge.id');
  const charge = await stripe.charges.retrieve(chargeId);
  const chargeAmount = integer(charge.amount, 'charge.amount', { positive: true });
  if (charge.status !== 'succeeded') throw new Error('El Charge todavía no está cobrado');
  if (!/^[a-z]{3}$/.test(charge.currency || '')) throw new Error('Moneda del Charge inválida');

  const transferId = typeof charge.transfer === 'string' ? charge.transfer : charge.transfer?.id;
  const configuredDestination = typeof charge.transfer_data?.destination === 'string'
    ? charge.transfer_data.destination
    : charge.transfer_data?.destination?.id;
  if (!transferId) {
    throw new MissingConnectTransferError(chargeId);
  }

  const original = await loadTransfer(stripe, id(transferId, 'tr_', 'charge.transfer'), 'original');
  if (original.destination !== configuredPartner || configuredDestination !== configuredPartner) {
    throw new Error('El Charge o Transfer apunta a otra cuenta Connect');
  }
  if (original.sourceTransaction && original.sourceTransaction !== chargeId) {
    throw new Error('El Transfer original pertenece a otro Charge');
  }

  const refunds = assertSinglePage(
    await stripe.refunds.list({ charge: chargeId, limit: 100 }),
    `Los refunds de ${chargeId}`
  );
  const disputes = assertSinglePage(
    await stripe.disputes.list({ charge: chargeId, limit: 100 }),
    `Las disputas de ${chargeId}`
  );
  const targetAmounts = connectClawbackTarget({
    chargeAmount,
    originalTransferAmount: original.amount,
    refunds,
    disputes,
    currency: charge.currency,
  });

  const transferGroup = `zynergia:${chargeId}`;
  const restorationCandidates = assertSinglePage(
    await stripe.transfers.list({
      destination: configuredPartner,
      transfer_group: transferGroup,
      limit: 100,
    }),
    `Los Transfers restaurativos de ${chargeId}`
  ).filter((transfer) =>
    transfer.id !== original.id &&
    transfer.metadata?.zynergia_kind === 'connect_restoration' &&
    transfer.metadata?.zynergia_charge_id === chargeId
  );
  const restorations = [];
  for (const transfer of restorationCandidates) {
    restorations.push(await loadTransfer(stripe, transfer.id, 'restoration'));
  }

  return {
    status: 'connect',
    chargeId,
    chargeAmount,
    currency: charge.currency,
    invoiceId: id(target.invoiceId, 'in_', 'invoice.id'),
    paymentIntentId: id(target.paymentIntentId, 'pi_', 'payment_intent.id'),
    customerId: id(target.customerId, 'cus_', 'customer.id'),
    subscriptionId: id(target.subscriptionId, 'sub_', 'subscription.id'),
    destination: configuredPartner,
    original,
    restorations,
    transferGroup,
    ...targetAmounts,
  };
}

async function syncTransfer(admin, snapshot, transfer, eventId) {
  return rpc(admin, 'sync_stripe_connect_transfer_snapshot', {
    p_stripe_charge_id: snapshot.chargeId,
    p_stripe_transfer_id: transfer.id,
    p_kind: transfer.kind,
    p_amount: transfer.amount,
    p_amount_reversed: transfer.amountReversed,
    p_currency: transfer.currency,
    p_destination_account_id: transfer.destination,
    p_transfer_created_at: transfer.createdAt,
    p_reversals: transfer.reversals,
    p_event_id: eventId,
  });
}

async function syncSnapshot(admin, snapshot, hints) {
  const result = await rpc(admin, 'sync_stripe_connect_charge_snapshot', {
    p_stripe_charge_id: snapshot.chargeId,
    p_stripe_invoice_id: snapshot.invoiceId,
    p_stripe_payment_intent_id: snapshot.paymentIntentId,
    p_stripe_customer_id: snapshot.customerId,
    p_stripe_subscription_id: snapshot.subscriptionId,
    p_stripe_original_transfer_id: snapshot.original.id,
    p_stripe_destination_account_id: snapshot.destination,
    p_currency: snapshot.currency,
    p_charge_amount: snapshot.chargeAmount,
    p_original_transfer_amount: snapshot.original.amount,
    p_original_transfer_amount_reversed: snapshot.original.amountReversed,
    p_original_transfer_created_at: snapshot.original.createdAt,
    p_effective_refund_amount: snapshot.effectiveRefundAmount,
    p_financial_dispute_amount: snapshot.financialDisputeAmount,
    p_desired_clawback_amount: snapshot.desiredClawbackAmount,
    p_disputes: snapshot.disputes,
    p_event_id: hints.eventId,
    p_event_created_at: hints.eventCreatedAt,
  });

  let state = result?.state;
  for (const transfer of [snapshot.original, ...snapshot.restorations]) {
    state = await syncTransfer(admin, snapshot, transfer, hints.eventId);
  }
  return state;
}

async function reverseDelta({ stripe, admin, snapshot, state, hints }) {
  let delta = snapshot.desiredClawbackAmount - stateNumber(state, 'net_clawback_amount');
  const transfers = stateTransfers(state);

  for (const transfer of transfers) {
    if (delta <= 0) break;
    const available = transfer.amount - transfer.amountReversed;
    if (available <= 0) continue;
    const amount = Math.min(delta, available);
    const key = operationKey('reverse', snapshot.chargeId, snapshot.desiredClawbackAmount, transfers, transfer.id);
    const reversal = await stripe.transfers.createReversal(transfer.id, {
      amount,
      metadata: {
        zynergia_charge_id: snapshot.chargeId,
        zynergia_kind: 'connect_clawback',
      },
    }, { idempotencyKey: key });
    await rpc(admin, 'record_stripe_connect_reversal', {
      p_operation_key: key,
      p_stripe_charge_id: snapshot.chargeId,
      p_source_transfer_id: transfer.id,
      p_stripe_reversal_id: reversal.id,
      p_amount: amount,
      p_event_id: hints.eventId,
    });
    const current = await loadTransfer(stripe, transfer.id, transfer.kind);
    state = await syncTransfer(admin, snapshot, current, hints.eventId);
    delta = snapshot.desiredClawbackAmount - stateNumber(state, 'net_clawback_amount');
  }

  if (delta > 0) throw new Error('No quedan fondos del socio suficientes para completar el clawback');
  return state;
}

async function restoreDelta({ stripe, admin, snapshot, state, hints }) {
  const amount = stateNumber(state, 'net_clawback_amount') - snapshot.desiredClawbackAmount;
  if (amount <= 0) return state;
  const transfers = stateTransfers(state);
  const key = operationKey('restore', snapshot.chargeId, snapshot.desiredClawbackAmount, transfers);
  const transfer = await stripe.transfers.create({
    amount,
    currency: snapshot.currency,
    destination: snapshot.destination,
    transfer_group: snapshot.transferGroup,
    metadata: {
      zynergia_charge_id: snapshot.chargeId,
      zynergia_kind: 'connect_restoration',
    },
  }, { idempotencyKey: key });
  await rpc(admin, 'record_stripe_connect_restoration', {
    p_operation_key: key,
    p_stripe_charge_id: snapshot.chargeId,
    p_stripe_transfer_id: transfer.id,
    p_amount: amount,
    p_currency: snapshot.currency,
    p_destination_account_id: snapshot.destination,
    p_transfer_created_at: isoFromUnix(transfer.created, 'transfer.created'),
    p_event_id: hints.eventId,
  });
  return syncTransfer(admin, snapshot, await loadTransfer(stripe, transfer.id, 'restoration'), hints.eventId);
}

function canonicalFingerprint(snapshot) {
  return stableHash({
    refunds: snapshot.effectiveRefundAmount,
    disputes: snapshot.disputes.map(({ id: disputeId, amount, status }) => ({
      disputeId,
      amount,
      status,
    })).sort((a, b) => a.disputeId.localeCompare(b.disputeId)),
    desired: snapshot.desiredClawbackAmount,
    transfers: [snapshot.original, ...snapshot.restorations].map((transfer) => ({
      id: transfer.id,
      amount: transfer.amount,
      amountReversed: transfer.amountReversed,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export async function reconcileStripeConnectCharge(target, hints, dependencies = {}) {
  const chargeId = target?.charge?.id || target?.chargeId || null;
  const taggedForConnect = Boolean(target?.subscription?.metadata?.zynergia_connect_cohort);
  if (!taggedForConnect) {
    return { status: 'legacy_without_connect', chargeId };
  }

  const stripe = dependencies.stripe || getStripe();
  const admin = dependencies.admin || getSupabaseAdmin();
  const configuredPartner = dependencies.partnerId || partnerAccountId();
  subscriptionUsesConnectCohort(target.subscription, configuredPartner);
  let reconciledChargeId = chargeId;

  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const snapshot = await loadCanonicalSnapshot(target, stripe, configuredPartner);
      reconciledChargeId = snapshot.chargeId;
      if (snapshot.status !== 'connect' || !('desiredClawbackAmount' in snapshot)) return snapshot;

      const before = canonicalFingerprint(snapshot);
      let state = await syncSnapshot(admin, snapshot, hints);
      const net = stateNumber(state, 'net_clawback_amount');
      if (net < snapshot.desiredClawbackAmount) {
        state = await reverseDelta({ stripe, admin, snapshot, state, hints });
      } else if (net > snapshot.desiredClawbackAmount) {
        state = await restoreDelta({ stripe, admin, snapshot, state, hints });
      }

      const current = await loadCanonicalSnapshot(target, stripe, configuredPartner);
      if (current.status !== 'connect' || !('desiredClawbackAmount' in current)) {
        throw new Error('El Charge Connect perdió su Transfer durante la conciliación');
      }
      if (canonicalFingerprint(current) !== before) continue;
      state = await syncSnapshot(admin, current, hints);
      if (stateNumber(state, 'net_clawback_amount') !== current.desiredClawbackAmount) continue;

      const result = await rpc(admin, 'complete_stripe_connect_reconciliation', {
        p_stripe_charge_id: current.chargeId,
        p_net_clawback_amount: current.desiredClawbackAmount,
        p_event_id: hints.eventId,
      });
      await rpc(admin, 'resolve_stripe_connect_anomaly', {
        p_stripe_charge_id: current.chargeId,
        p_event_id: hints.eventId,
        p_event_created_at: hints.eventCreatedAt,
      });
      return result;
    }
    throw new Error('Stripe cambió demasiadas veces durante la conciliación Connect');
  } catch (error) {
    if (error?.code === 'CONNECT_TRANSFER_MISSING') {
      await rpc(admin, 'record_stripe_connect_anomaly', {
        p_stripe_charge_id: error.chargeId,
        p_anomaly_kind: 'missing_transfer',
        p_event_id: hints.eventId,
        p_event_created_at: hints.eventCreatedAt,
        p_last_error: error.message,
      });
    } else if (reconciledChargeId?.startsWith('ch_')) {
      await rpc(admin, 'fail_stripe_connect_reconciliation', {
        p_stripe_charge_id: reconciledChargeId,
        p_last_error: String(error?.message || error).slice(0, 500),
      }).catch(() => {});
    }
    throw error;
  }
}
