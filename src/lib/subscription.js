/**
 * subscription.js — RevenueCat In-App Purchase helper
 *
 * Setup required (do this once you have your Apple Developer account):
 * 1. Create account at revenuecat.com
 * 2. npm install @revenuecat/purchases-capacitor
 * 3. Create products in App Store Connect:
 *    - zynergia_monthly  → $16.99/month
 *    - zynergia_annual   → $169.99/year
 * 4. Create the same products in Google Play Console
 * 5. Link both stores in RevenueCat dashboard
 * 6. Replace REVENUECAT_API_KEY_IOS and REVENUECAT_API_KEY_ANDROID below
 */

// TODO: Replace with your actual RevenueCat API keys from revenuecat.com
const REVENUECAT_API_KEY_IOS = 'appl_AxuGgpyaAtRrNTFZkmeNimzXfBu';
const REVENUECAT_API_KEY_ANDROID = 'goog_nzAkGPhjdRkCrYBTIKDTKbCAHwx';

const ENTITLEMENT_ID = 'Zynergia Pro';

let purchasesInitialized = false;

function isNative() {
  try {
    // Check if Capacitor native platform is available
    return typeof window !== 'undefined' &&
      window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

async function getPurchases() {
  if (!isNative()) return null;
  try {
    const { Purchases } = await import(/* @vite-ignore */ '@revenuecat/purchases-capacitor');
    return Purchases;
  } catch {
    console.warn('[Subscription] RevenueCat not installed. Run: npm install @revenuecat/purchases-capacitor');
    return null;
  }
}

/**
 * Initialize RevenueCat. Call once on app start (after auth).
 */
export async function initSubscription(userId) {
  if (purchasesInitialized || !isNative()) return;
  const Purchases = await getPurchases();
  if (!Purchases) return;

  try {
    const platform = window.Capacitor?.getPlatform?.();
    const apiKey = platform === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    await Purchases.configure({ apiKey });
    if (userId) {
      await Purchases.logIn({ appUserID: userId });
    }
    purchasesInitialized = true;
  } catch (err) {
    console.error('[Subscription] Init error:', err);
  }
}

/**
 * Check if the current user has an active subscription.
 * Returns true in web/dev environment (to allow testing without payment).
 */
export async function hasActiveSubscription() {
  if (!isNative()) {
    // Web / dev mode — always allow access
    return true;
  }
  const Purchases = await getPurchases();
  if (!Purchases) return true; // If plugin not installed, allow access

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    return !!entitlement;
  } catch (err) {
    console.error('[Subscription] Check error:', err);
    return false;
  }
}

/**
 * Get available subscription packages to display in Paywall.
 */
export async function getOfferings() {
  const Purchases = await getPurchases();
  if (!Purchases) return null;

  try {
    const { current } = await Purchases.getOfferings();
    return current;
  } catch (err) {
    console.error('[Subscription] Offerings error:', err);
    return null;
  }
}

/**
 * Purchase a specific package.
 * @param {object} pkg - Package object from getOfferings()
 */
export async function purchasePackage(pkg) {
  const Purchases = await getPurchases();
  if (!Purchases) throw new Error('RevenueCat not available');

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

/**
 * Restore purchases (required by Apple guidelines).
 */
export async function restorePurchases() {
  const Purchases = await getPurchases();
  if (!Purchases) return false;

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (err) {
    console.error('[Subscription] Restore error:', err);
    return false;
  }
}
