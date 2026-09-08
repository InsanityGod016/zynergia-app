import { describe, expect, it, vi } from 'vitest';
import { nextVisibleUpdate, releaseDecision, rememberUpdate, updateSeenKey } from '../../src/lib/appUpdates';

const release = { latestBuild: 15, minimumBuild: 14, published: true };

describe('app update decisions', () => {
  it('offers a newer published build only once', () => {
    expect(releaseDecision({ release, installedBuild: 14 }).status).toBe('available');
    expect(releaseDecision({ release, installedBuild: 14, seenBuild: 15 }).status).toBe('seen');
    expect(releaseDecision({ release, installedBuild: 14, seenBuild: 15, force: true }).status).toBe('available');
  });

  it('requires an incompatible update even when it was seen', () => {
    expect(releaseDecision({
      release: { ...release, minimumBuild: 15 },
      installedBuild: 14,
      seenBuild: 15,
    }).status).toBe('required');
  });

  it('does nothing for current, unpublished, or malformed releases', () => {
    expect(releaseDecision({ release, installedBuild: 15 }).status).toBe('current');
    expect(releaseDecision({ release: { ...release, published: false }, installedBuild: 14 }).status).toBe('none');
    expect(releaseDecision({ release: { ...release, latestBuild: 'bad' }, installedBuild: 14 }).status).toBe('none');
  });

  it('scopes the dismissal by platform', () => {
    expect(updateSeenKey('ios')).not.toBe(updateSeenKey('android'));
  });

  it('does not crash when a device cannot persist the dismissal', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('unavailable'); } });
    expect(() => rememberUpdate({ platform: 'ios', latestBuild: 15 })).not.toThrow();
    vi.unstubAllGlobals();
  });

  it('does not unlock a known incompatible build after a temporary network error', () => {
    const required = { status: 'required', latestBuild: 15, minimumBuild: 15 };
    expect(nextVisibleUpdate(required, { status: 'unavailable' })).toBe(required);
    expect(nextVisibleUpdate({ status: 'available' }, { status: 'unavailable' })).toBeNull();
    expect(nextVisibleUpdate(required, { status: 'current' })).toBeNull();
  });
});
