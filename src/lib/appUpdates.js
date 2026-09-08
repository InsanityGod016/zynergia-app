import { Capacitor } from '@capacitor/core';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app-links';

export const MOBILE_RELEASES_URL = 'https://zynergia.pro/.well-known/mobile-releases.json';

const STORE_URLS = {
  ios: APP_STORE_URL,
  android: PLAY_STORE_URL,
};

/**
 * @typedef {{
 *   latestBuild?: number | string,
 *   minimumBuild?: number | string,
 *   published?: boolean,
 *   version?: string,
 *   title?: string,
 *   body?: string,
 * }} PlatformRelease
 */

function positiveBuild(value) {
  const build = Number.parseInt(String(value), 10);
  return Number.isInteger(build) && build > 0 ? build : null;
}

/**
 * @param {{
 *   release?: PlatformRelease | null,
 *   installedBuild?: number | string | null,
 *   seenBuild?: number | string | null,
 *   force?: boolean,
 * }} options
 */
export function releaseDecision({ release, installedBuild, seenBuild = null, force = false } = {}) {
  const current = positiveBuild(installedBuild);
  const latest = positiveBuild(release?.latestBuild);
  const minimum = positiveBuild(release?.minimumBuild);
  if (!current || !latest || release?.published !== true) return { status: 'none' };

  if (minimum && current < minimum) {
    return { status: 'required', latestBuild: latest, minimumBuild: minimum };
  }
  if (current >= latest) return { status: 'current', latestBuild: latest };
  if (!force && positiveBuild(seenBuild) === latest) return { status: 'seen', latestBuild: latest };
  return { status: 'available', latestBuild: latest };
}

export function nextVisibleUpdate(current, result) {
  if (['available', 'required'].includes(result?.status)) return result;
  if (result?.status === 'unavailable' && current?.status === 'required') return current;
  return null;
}

export function updateSeenKey(platform) {
  return `zynergia:update-seen:${platform}`;
}

function readSeenBuild(platform) {
  try {
    return globalThis.localStorage?.getItem(updateSeenKey(platform)) || null;
  } catch {
    return null;
  }
}

async function fetchManifest(fetcher = fetch) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher(MOBILE_RELEASES_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('release_manifest_unavailable');
    const manifest = await response.json();
    return manifest?.schemaVersion === 1 ? manifest : null;
  } finally {
    window.clearTimeout(timeout);
  }
}

/** @param {{ force?: boolean, fetcher?: typeof fetch }} options */
export async function checkForAppUpdate({ force = false, fetcher } = {}) {
  if (!Capacitor.isNativePlatform()) return { status: 'web' };
  const platform = Capacitor.getPlatform();
  if (!(platform in STORE_URLS)) return { status: 'unsupported' };

  try {
    const [{ App }, manifest] = await Promise.all([
      import('@capacitor/app'),
      fetchManifest(fetcher),
    ]);
    const info = await App.getInfo();
    const release = manifest?.[platform];
    const seenBuild = readSeenBuild(platform);
    const decision = releaseDecision({ release, installedBuild: info.build, seenBuild, force });
    return {
      ...decision,
      platform,
      installedBuild: positiveBuild(info.build),
      version: release?.version || '',
      title: release?.title || 'Actualización disponible',
      body: release?.body || 'Hay una versión nueva de Zynergia lista para instalar.',
      storeUrl: STORE_URLS[platform],
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export function rememberUpdate(update) {
  if (!update?.platform || !positiveBuild(update?.latestBuild)) return;
  try {
    globalThis.localStorage?.setItem(updateSeenKey(update.platform), String(update.latestBuild));
  } catch {
    // Storage failure must not prevent opening the store or using the app.
  }
}
