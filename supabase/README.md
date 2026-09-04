# Backend release gates

The billing migration is intentionally incremental: this repository does not contain the
production schema that originally created `contacts`, `sales`, `tasks`, `partners`, or
`settings`. Apply it to a staging clone before production.

## Required before deploying account deletion

Configure a scheduler to call `GET /api/account/process-deletions` at least once a day with
`Authorization: Bearer $CRON_SECRET`. Stripe webhooks revoke access when the paid period ends;
this daily worker is the reconciliation fallback that completes data deletion within 24 hours. Do not expose
`/api/account/deletion-request` in production until that scheduler has been exercised in
staging. Only an eligible, unblocked `active` subscription with a future `current_period_end`
is scheduled so the user keeps the paid period. `trialing`, `past_due`, `unpaid`, `paused`,
`incomplete`, terminal, fully refunded, and disputed accounts are canceled and deleted
immediately; this prevents Smart Retries or another future collection after the request. The
worker cancels any remaining Stripe subscription, deletes user data, and deletes Supabase Auth.

Required server-only environment variables:

- `SUPABASE_URL` (or the existing `VITE_SUPABASE_URL` fallback)
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_ANNUAL_PRICE_ID` only when an existing annual subscription must remain entitled
- `STRIPE_LEGACY_PRICE_IDS` for still-valid historical prices
- `STRIPE_PARTNER_ACCOUNT_ID` with the single reviewed `acct_...` destination
- `STRIPE_PARTNER_EMAIL` matching that account's approved Stripe email; Checkout also requires
  its metadata role to remain `zynergia_partner`
- `STRIPE_PLATFORM_COUNTRY=US` and `STRIPE_PARTNER_COUNTRY=MX`; Checkout retrieves both Stripe
  Accounts and stops if the live account countries differ from this reviewed route
- `CONNECT_ADMIN_SECRET` with at least 32 random characters, used only to generate a fresh
  Stripe-hosted onboarding link through `POST /api/connect/onboarding-link`
- `STRIPE_CONNECT_REVERSALS_READY=true` only after migration `202608310001` is applied and the
  financial control described below is exercised in Stripe test mode; its default remains false
- `APP_URL`
- `CORS_ALLOWED_ORIGINS` for any additional web origin
- `CRON_SECRET`
- `DELETE_REAUTH_MAX_AGE_SECONDS` when the default ten-minute password reauthentication
  window should be changed; custom JWT hooks must preserve timestamped `amr` entries
- `NEW_SIGNUPS_ENABLED=true` only after the Stripe inventory/backfill is reconciled; omit it
  or set it to any other value to keep checkout fail-closed during Phase 0
- `VITE_SUPPORT_EMAIL` with the verified, monitored support inbox used by the web app and
  store listings; the release gate refuses an empty or malformed address
- `VITE_APP_STORE_URL` with the exact public `https://apps.apple.com/...` listing; it cannot
  be inferred safely from the bundle ID and is required before distributing the shared RC
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the release gate blocks any web or mobile
  artifact that would boot into the fail-closed “Zynergia necesita configuración” screen

## Stripe Connect 80/20 gate

Checkout validates the configured connected account on every new purchase and passes
`transfer_data.amount_percent = 20` to the Stripe Subscription. There is no retry without
Connect: a missing, inaccessible, incomplete, payout-disabled, requirements-blocked, or
transfers-inactive account stops Checkout.

That Subscription setting applies automatically to every renewal of a newly created plan.
Existing legacy Subscriptions are intentionally not mutated by this release: inventory their
Customer, Price, destination, tax behavior, and current status first, then backfill them in Stripe
test mode and production from an approved effective date. Until that backfill is reconciled, they
remain on their existing payout terms and must not be described as part of the new 80/20 cohort.

Migration `202608310001_stripe_connect_ledger.sql` adds a service-role-only charge ledger. Every
financial webhook reloads the canonical Charge, Refunds, Disputes, original Transfer, every
Transfer Reversal, and any Zynergia restoration Transfer from Stripe. It computes one target from
the original Transfer amount actually created by Stripe, then moves only the difference. A refund
and dispute may overlap, but their combined clawback is capped at the original partner Transfer.
Automatic refund reversals already reflected in `Transfer.amount_reversed` are never repeated.

An open or lost dispute is not automatically recovered from a destination account by Stripe.
CoreFlowAI is in the US and the partner is expected to be in Mexico; Stripe warns that cross-border
Transfer Reversals can be restricted and recommends waiting for the dispute to be lost. Zynergia
therefore blocks app access immediately for `needs_response`/`under_review`, but defers the partner
clawback until canonical status `lost`. If it becomes `won`, no partner money moved and no restore
is needed. A failed/canceled refund, or a prior real reversal later no longer justified, can require
a new restoration Transfer; Stripe does not support undoing a reversal. Restoration
Transfers are tagged and rediscovered after process failure. Operation keys, Stripe idempotency
keys, unique Stripe object IDs, canonical re-reads, and the webhook event ledger make duplicate
and out-of-order delivery converge to the same balance.

Official semantics used here: [destination-charge refunds](https://docs.stripe.com/connect/destination-charges#issue-refunds),
[Connect disputes](https://docs.stripe.com/connect/disputes), and
[Transfer Reversals](https://docs.stripe.com/api/transfer_reversals).

Keep `STRIPE_CONNECT_REVERSALS_READY=false` in production until the migration has been applied to
staging and the scenarios below pass with real Stripe test objects. The flag controls new Checkout;
the webhook remains fail-closed and returns 500 when any financial state is ambiguous, paginated
beyond the reviewed limit, cross-currency, or cannot be reversed/restored.

The gate can become true only after tests prove all of the following against destination charges:

1. partial and total refunds reverse the same proportion of the original partner transfer;
2. an open dispute blocks app access without moving cross-border funds, and `lost` claws back once;
3. a won dispute restores only a prior reversal that actually exists;
4. refund and dispute events for the same Charge cannot double-reverse or double-restore funds;
5. every invoice, Charge, Transfer, reversal, and restoration is persisted and reconciled.

The onboarding endpoint never creates an account or accepts an account ID from the caller. Create
or select the single account in Stripe Dashboard, configure its ID server-side, then call the
endpoint with `Authorization: Bearer $CONNECT_ADMIN_SECRET`. Its response is a short-lived,
single-use Stripe URL and contains no administrative secret.

Stripe must send these events to `/api/stripe/webhook`:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `charge.succeeded`
- `charge.updated`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`
- `charge.dispute.funds_withdrawn`
- `charge.dispute.funds_reinstated`
- `transfer.created`
- `transfer.updated`
- `transfer.reversed`

A total refund or an open/lost dispute revokes Stripe access. Partial refunds do not. Incidents
are stored per Charge or Dispute: a later `invoice.paid` resolves older refund incidents, and a
Dispute whose canonical Stripe status is `won` resolves only that Dispute. Access returns only
when no blocking incident remains. Blocking wins when two events have the same second.

Refund and dispute handlers retrieve Charge, Customer, Dispute, Invoice Payment, Invoice, and
Subscription from Stripe by server-issued IDs, then require one allowed Zynergia price. A
legacy Charge without a PaymentIntent, zero/multiple paid Invoice Payment matches, a Customer
mismatch, multiple current subscriptions, or an unsupported price fails the webhook for retry
and never relaxes access. Resolve those cases manually before marking the webhook processed.

## Domain RPC gate

`record_sale` and `anonymize_contact` are not safe to infer from JSX. The client reveals
field names but not production types, foreign keys, triggers, existing policies, or delete
semantics. The row-free SQL Editor inventory is versioned as
`supabase/schema.production.json`; the gate also accepts a normal `pg_dump` schema-only SQL file.
Run:

```sh
node supabase/scripts/predeploy-gate.mjs supabase/schema.production.json
```

Set `DELETION_CRON_CONFIGURED=true` only in the release environment after the deletion scheduler
has actually been exercised; the gate intentionally reports the missing attestation otherwise.

The gate remains red until a reviewed migration defines both RPCs with ownership checks,
idempotency, transactional side effects, and RLS-compatible grants; the sales client must
then use `record_sale`. It also verifies that every exposed domain table has RLS enabled and
that every legacy team RPC called by the mobile client exists in the reviewed schema export.
Review those RPC bodies for `auth.uid()`-based authorization and team-bound access before
attesting the release. The fail-closed SQL placeholder is in
`supabase/pending/202608190002_domain_invariants.BLOCKED.sql`; it is kept outside
`migrations/` so the independently testable billing migration can still be staged.

## Correo de alta: configuración obligatoria

El SMTP predeterminado de Supabase es únicamente para pruebas y no entrega altas reales de
producción. Antes de habilitar `NEW_SIGNUPS_ENABLED`, configurar **Custom SMTP** con Resend:

1. Verificar `auth.zynergia.pro` en Resend y publicar los registros SPF, DKIM y DMARC que
   indique el panel. Desactivar el tracking de aperturas y enlaces.
2. En Supabase Dashboard → Authentication → SMTP Settings, activar Custom SMTP con host
   `smtp.resend.com`, usuario `resend`, una API key restringida como contraseña y un remitente
   reconocible, por ejemplo `Zynergia <cuenta@auth.zynergia.pro>`.
3. En Authentication → URL Configuration, usar `https://zynergia.pro` como Site URL y permitir
   `https://zynergia.pro/cuenta` como redirect URL.
4. En Authentication → Email Templates, usar los asuntos `Zynergia — confirma tu correo` y
   `Zynergia — restablece tu contraseña`, con los contenidos versionados en
   `supabase/email-templates/confirm-signup.html` y
   `supabase/email-templates/reset-password.html`.
5. Enviar una alta de prueba a un correo que no pertenezca al equipo, abrir el botón y confirmar
   que termina en `/cuenta`. Probar también Spam, reenvío y un enlace expirado.

El plan gratuito de Resend cubre hasta 3,000 correos al mes y 100 al día al momento de esta
implementación. Es un límite externo: vigilarlo y pasar a un plan pagado antes de alcanzarlo;
un alta nunca debe aparentar que envió correo si el proveedor la rechazó.

The adversarial suite must retain a JWT issued before account deletion and replay it after
`auth.admin.deleteUser`. Every domain read, write, and RPC must still fail. Supabase access
tokens are stateless until expiry, so deleting the Auth row alone is not an authorization
boundary; domain policies must also require a live, entitled, non-deleted account.

Before production, backfill Stripe customers/subscriptions into `billing_accounts`, resolve
duplicate emails and multiple live subscriptions manually, then verify claim, renewal,
past-due grace, cancellation, partial/full refunds, dispute open/won, out-of-order webhook
replay, scheduled deletion, and Auth deletion in Stripe test mode against the staging database.
