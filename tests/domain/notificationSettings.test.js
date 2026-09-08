import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const settingsSource = () => readFile(new URL('../../src/pages/Settings.jsx', import.meta.url), 'utf8');

describe('notification settings flow', () => {
  it('explains notifications before requesting permission', async () => {
    const source = await settingsSource();
    const explanation = source.indexOf('Zynergia puede recordarte tareas');
    const permissionRequest = source.indexOf('requestNotificationPermission()', explanation);
    expect(explanation).toBeGreaterThan(-1);
    expect(permissionRequest).toBeGreaterThan(explanation);
  });

  it('persists revocation and rolls back a failed enable', async () => {
    const source = await settingsSource();
    const revocation = source.slice(
      source.indexOf('const disableIfPermissionWasRevoked'),
      source.indexOf('const handleNotificationToggle'),
    );
    expect(revocation).toContain("notificationPermissionState(permission) !== 'blocked'");
    expect(revocation).toContain("toggleNotifMutation.mutateAsync({ notifications_enabled: false, push_consent_given: false })");
    expect(source).toMatch(/toggleNotifMutation\.mutateAsync\(notificationPreferences\(enabledForm, true\)\)[\s\S]+setPushSubscriptionEnabled\(false\)/);
  });

  it('requires fresh push consent for migrated users', async () => {
    const source = await settingsSource();
    expect(source).toContain('push_consent_given: settings.push_consent_given === true');
    expect(source).toContain('Activar resúmenes y Fast Start');
    expect(source).toMatch(/requestPushPermission\(user\?\.id\)[\s\S]+push_consent_given: true/);
  });

  it('opts the device back out when saving fresh push consent fails', async () => {
    const source = await settingsSource();
    const enableFlow = source.split('const handlePushEnable = async () => {')[1].split('const cancelBillingMutation')[0];
    expect(enableFlow).toMatch(/catch \{[\s\S]+push_consent_given: false[\s\S]+setPushSubscriptionEnabled\(false\)/);
  });

  it('uses the device timezone instead of leaving the migration default', async () => {
    const source = await settingsSource();
    expect(source).toContain("import { deviceTimezone } from '@/lib/timezone'");
    expect(source).toContain("timezone: deviceTimezone() || settings.timezone");
  });
});
