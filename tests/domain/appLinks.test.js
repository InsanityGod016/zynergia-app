import { describe, expect, it } from 'vitest';
import { APP_WEB_URL, isAppWebHost, mobileRouteForAppUrl } from '../../src/lib/app-links';

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
});
