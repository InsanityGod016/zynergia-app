/**
 * subscription.js — control de acceso por suscripción.
 *
 * Modelo de negocio (aprobación App Store, guideline 3.1.3b multiplataforma):
 * - La suscripción se paga EN LA WEB (zynergia.pro) con Stripe.
 * - La cuenta de Supabase solo se crea después de pagar.
 * - La app nativa NO vende nada, NO muestra paywall y NO menciona pagos
 *   externos: si el usuario tiene cuenta, tiene acceso.
 *
 * Por eso este módulo no usa RevenueCat ni IAP.
 */
export async function hasActiveSubscription() {
  return true;
}
