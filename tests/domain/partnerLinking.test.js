import { describe, expect, it } from 'vitest';
import { normalizePartnerCode, partnerLinkErrorMessage } from '@/lib/partnerLinking';

describe('partner linking helpers', () => {
  it('keeps codes in the server format', () => {
    expect(normalizePartnerCode('davi-38!más')).toBe('DAVI38MS');
  });

  it('explains a pre-existing leader link', () => {
    expect(partnerLinkErrorMessage({ message: 'partner_already_linked' })).toContain('otro líder');
  });
});
