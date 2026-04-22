const REVENUECAT_API_KEY_IOS = 'appl_AxuGgpyaAtRrNTFZkmeNimzXfBu';
const REVENUECAT_API_KEY_ANDROID = 'goog_nzAkGPhjdRkCrYBTIKDTKbCAHwx';

const ENTITLEMENT_ID = 'Zynergia Pro';

let initPromise = null; // single in-flight init promise — prevents race conditions

function isNative() {
  try {
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
    return null;
  }
}

export async function initSubscription(userId) {
  if (!isNative()) return;
  if (initPromise) return initPromise; // already initializing — wait for it

  initPromise = (async () => {
    const Purchases = await getPurchases();
    if (!Purchases) return;
    try {
      const platform = window.Capacitor?.getPlatform?.();
      const apiKey = platform === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      await Purchases.configure({ apiKey });
      if (userId) await Purchases.logIn({ appUserID: userId });
    } catch (err) {
      console.error('[Subscription] Init error:', err);
      initPromise = null; // allow retry on next call
    }
  })();

  return initPromise;
}

export async function hasActiveSubscription() {
  if (!isNative()) return true; // web/dev — always allow

  // Wait for initialization before querying
  if (initPromise) await initPromise;

  const Purchases = await getPurchases();
  if (!Purchases) return true;

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch {
    // If not configured yet (no active session), let user through
    return false;
  }
}

export async function getOfferings() {
  if (initPromise) await initPromise;
  const Purchases = await getPurchases();
  if (!Purchases) return null;
  try {
    const { current } = await Purchases.getOfferings();
    return current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg) {
  if (initPromise) await initPromise;
  const Purchases = await getPurchases();
  if (!Purchases) throw new Error('RevenueCat not available');
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

export async function restorePurchases() {
  if (initPromise) await initPromise;
  const Purchases = await getPurchases();
  if (!Purchases) return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
  }
}
