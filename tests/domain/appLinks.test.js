import { describe, expect, it } from 'vitest';
import {
  APP_WEB_URL,
  clearPendingTemplateShare,
  isAppWebHost,
  mobileRouteForAppUrl,
  readPendingTemplateShare,
  rememberPendingTemplateShare,
  templateSharePath,
  templateShareUrl,
} from '../../src/lib/app-links';

describe('web surfaces', () => {
  it('serves the CRM only on the dedicated production host', () => {
    expect(isAppWebHost('app.zynergia.pro')).toBe(true);
    expect(isAppWebHost('zynergia.pro')).toBe(false);
    expect(isAppWebHost('app.zynergia.pro.evil.test')).toBe(false);
    expect(isAppWebHost('localhost')).toBe(false);
    expect(APP_WEB_URL).toBe('https://app.zynergia.pro');
  });
});

describe('mobile app links', () => {
  it('opens only the canonical download route inside the app', () => {
    expect(mobileRouteForAppUrl('https://zynergia.pro/app')).toBe('/');
    expect(mobileRouteForAppUrl('https://zynergia.pro/app/')).toBe('/');
  });

  it('rejects hostile hosts and unrelated web routes', () => {
    expect(mobileRouteForAppUrl('https://zynergia.pro.evil.test/app')).toBeNull();
    expect(mobileRouteForAppUrl('https://zynergia.pro/crear-cuenta')).toBeNull();
    expect(mobileRouteForAppUrl('not-a-url')).toBeNull();
  });

  it('accepts only opaque template-share routes and keeps them through login', () => {
    const token = 'ab'.repeat(32);
    const route = `/app/plantillas/${token}`;
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };

    expect(templateSharePath(token)).toBe(route);
    expect(templateShareUrl(token)).toBe(`https://zynergia.pro${route}`);
    expect(mobileRouteForAppUrl(`https://zynergia.pro${route}`)).toBe(route);
    expect(mobileRouteForAppUrl(`https://zynergia.pro${route}/`)).toBe(route);
    expect(mobileRouteForAppUrl(`https://evil.test${route}`)).toBeNull();
    expect(templateSharePath('short')).toBeNull();
    expect(rememberPendingTemplateShare(route, storage)).toBe(true);
    expect(readPendingTemplateShare(storage)).toBe(route);
    clearPendingTemplateShare(storage);
    expect(readPendingTemplateShare(storage)).toBeNull();
  });

  it('keeps template links usable when private storage is unavailable', () => {
    const token = 'cd'.repeat(32);
    const route = `/app/plantillas/${token}`;
    const blockedStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };

    expect(rememberPendingTemplateShare(route, blockedStorage)).toBe(false);
    expect(readPendingTemplateShare(blockedStorage)).toBeNull();
    expect(() => clearPendingTemplateShare(blockedStorage)).not.toThrow();
  });
});
