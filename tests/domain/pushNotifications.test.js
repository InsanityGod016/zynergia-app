import { describe, expect, it } from 'vitest';
import { partnerForPushRoute, safePushRoute } from '../../src/lib/pushNotifications.js';

describe('safePushRoute', () => {
  it('allows only known in-app destinations', () => {
    expect(safePushRoute('/')).toBe('/');
    expect(safePushRoute('/Tasks?taskId=task_123')).toBe('/Tasks?taskId=task_123');
    expect(safePushRoute('/Partners?partnerId=partner-9')).toBe('/Partners?partnerId=partner-9');
  });

  it('drops unknown query values instead of forwarding them', () => {
    expect(safePushRoute('/Tasks?taskId=hello%2Fworld')).toBe('/Tasks');
    expect(safePushRoute('/Partners?token=secret')).toBe('/Partners');
  });

  it('rejects external and unknown destinations', () => {
    expect(safePushRoute('https://example.com/Tasks?taskId=1')).toBeNull();
    expect(safePushRoute('/Settings')).toBeNull();
    expect(safePushRoute('javascript:alert(1)')).toBeNull();
  });

  it('resolves only a partner that still belongs to the loaded team', () => {
    const partners = [{ id: 'partner-1' }, { id: 'partner-2' }];
    expect(partnerForPushRoute(partners, 'partner-2')).toEqual({ id: 'partner-2' });
    expect(partnerForPushRoute(partners, 'missing')).toBeNull();
    expect(partnerForPushRoute(partners, '')).toBeNull();
  });
});
