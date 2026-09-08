import { describe, expect, it } from 'vitest';
import { analyzeContactImports, createImportCandidates, resolveImportCandidate, selectImportCandidatePhone } from '@/lib/contactImport';

describe('device contact import', () => {
  it('keeps selection explicit and prefers the primary mobile number', () => {
    const candidates = createImportCandidates([{
      id: 'native-1',
      displayName: 'Ana Pérez',
      phoneNumbers: [
        { type: 'home', value: '55 1111 2222' },
        { type: 'mobile', value: '55 3333 4444', pref: true },
      ],
    }]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].phoneOptions[0].raw).toBe('55 3333 4444');
    expect(analyzeContactImports(candidates, [], [])).toMatchObject({ rows: [], statusById: {} });
    expect(resolveImportCandidate(candidates[0]).valid).toBe(false);
    candidates[0].countryConfirmed = true;
    expect(resolveImportCandidate(candidates[0])).toMatchObject({
      full_name: 'Ana Pérez',
      phone_e164: '+525533334444',
      phone_country_iso: 'MX',
      valid: true,
    });
  });

  it('preserves an explicit country and skips existing and in-batch duplicates', () => {
    const candidates = createImportCandidates([
      { id: 'co-1', displayName: 'Carlos', phoneNumbers: [{ value: '+57 300 123 4567' }] },
      { id: 'co-2', displayName: 'Carlos duplicado', phoneNumbers: [{ value: '+57 300 123 4567' }] },
      { id: 'mx-1', displayName: 'María', phoneNumbers: [{ value: '+52 55 2222 3333' }] },
    ]);
    const analysis = analyzeContactImports(candidates, candidates.map(item => item.id), [{ phone: '+52 55 2222 3333' }]);

    expect(analysis.rows).toEqual([expect.objectContaining({
      full_name: 'Carlos',
      phone_e164: '+573001234567',
      phone_country_iso: 'CO',
    })]);
    expect(analysis.statusById).toEqual({ 'co-1': 'ready', 'co-2': 'duplicate', 'mx-1': 'duplicate' });
  });

  it('requires the correct country for a national number', () => {
    const [candidate] = createImportCandidates([
      { id: 'es-1', displayName: 'Lucía', phoneNumbers: [{ value: '612 345 678' }] },
    ]);
    candidate.dialCode = '+34';
    candidate.countryIso = 'ES';
    candidate.countryConfirmed = true;
    expect(resolveImportCandidate(candidate)).toMatchObject({
      phone_e164: '+34612345678',
      phone_country_iso: 'ES',
      valid: true,
    });
  });

  it('requires a fresh country confirmation after changing to a national number', () => {
    const [candidate] = createImportCandidates([{
      id: 'two-phones',
      displayName: 'Dos Teléfonos',
      phoneNumbers: [
        { value: '+57 300 123 4567', pref: true },
        { value: '55 4444 5555' },
      ],
    }]);

    Object.assign(candidate, selectImportCandidatePhone(candidate, 1));
    expect(candidate.countryConfirmed).toBe(false);
    expect(resolveImportCandidate(candidate).valid).toBe(false);
    candidate.countryIso = 'MX';
    candidate.dialCode = '+52';
    candidate.countryConfirmed = true;
    expect(resolveImportCandidate(candidate)).toMatchObject({
      phone_e164: '+525544445555',
      phone_country_iso: 'MX',
      valid: true,
    });
  });

  it('does not guess an ISO country for an ambiguous international dial code', () => {
    const [candidate] = createImportCandidates([{
      id: 'nanp',
      displayName: 'Número internacional',
      phoneNumbers: [{ value: '+1 212 555 0100' }],
    }]);
    expect(resolveImportCandidate(candidate)).toMatchObject({
      phone_e164: '+12125550100',
      phone_country_iso: null,
      valid: true,
    });
  });
});
