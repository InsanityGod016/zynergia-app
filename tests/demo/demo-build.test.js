import { describe, expect, it } from 'vitest';
import { isLocalDemoBuild, isLocalReviewBuild } from '../../src/lib/demo-build.js';

describe('local demo build gate', () => {
  it('fails closed unless both the demo mode and explicit flag are present locally', () => {
    expect(isLocalDemoBuild({ mode: 'demo', flag: 'true' })).toBe(true);
    expect(isLocalDemoBuild({ mode: 'production', flag: 'true' })).toBe(false);
    expect(isLocalDemoBuild({ mode: 'demo', flag: 'false' })).toBe(false);
    expect(isLocalDemoBuild({ mode: 'demo' })).toBe(false);
    expect(isLocalDemoBuild({ mode: 'demo', flag: 'true', ci: 'true' })).toBe(false);
  });
});

describe('local review build gate', () => {
  it('fails closed unless review mode and its explicit local flag match', () => {
    expect(isLocalReviewBuild({ mode: 'review', flag: 'true' })).toBe(true);
    expect(isLocalReviewBuild({ mode: 'production', flag: 'true' })).toBe(false);
    expect(isLocalReviewBuild({ mode: 'review', flag: 'false' })).toBe(false);
    expect(isLocalReviewBuild({ mode: 'review', flag: 'true', ci: 'true' })).toBe(false);
  });
});
