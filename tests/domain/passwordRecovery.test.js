import { describe, expect, it } from 'vitest';
import { matchesPasswordRecoveryToken } from '../../src/lib/passwordRecovery';

describe('password recovery access', () => {
  it('never accepts a normal session as a recovery session', () => {
    expect(matchesPasswordRecoveryToken('recovery-token', { access_token: 'normal-token' })).toBe(false);
    expect(matchesPasswordRecoveryToken('', { access_token: 'normal-token' })).toBe(false);
  });

  it('accepts only the session captured from PASSWORD_RECOVERY', () => {
    expect(matchesPasswordRecoveryToken('recovery-token', { access_token: 'recovery-token' })).toBe(true);
  });
});
