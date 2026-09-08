import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceTimezone } from '@/lib/timezone';

describe('device timezone', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns a valid runtime timezone', () => {
    expect(deviceTimezone()).toEqual(expect.any(String));
  });

  it('does not invent a timezone when the runtime cannot provide one', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: '' }),
    }));
    expect(deviceTimezone()).toBeNull();
  });
});
