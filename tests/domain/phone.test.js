import { describe, expect, it } from 'vitest';
import { normalizePhone, splitPhone, whatsappUrl } from '../../src/lib/phone';

describe('phone helpers', () => {
  it('normalizes a Mexican national number', () => {
    expect(normalizePhone('+52', '55 1234 5678')).toMatchObject({
      e164: '+525512345678',
      valid: true,
    });
  });

  it('does not duplicate a pasted country code', () => {
    expect(normalizePhone('+52', '+52 55 1234 5678').e164).toBe('+525512345678');
    expect(normalizePhone('+52', '52 55 1234 5678').e164).toBe('+525512345678');
  });

  it('does not strip a national number merely because it starts like the dial code', () => {
    expect(normalizePhone('+52', '5212 345 678').e164).toBe('+525212345678');
  });

  it('normalizes the common Argentina mobile format for WhatsApp', () => {
    expect(normalizePhone('+54', '11 2345 6789')).toMatchObject({
      e164: '+5491123456789',
      valid: true,
    });
    expect(whatsappUrl('+54 11 2345 6789')).toBe('');
  });

  it.each([
    ['+1', '305 555 0100', '+13055550100'],
    ['+57', '300 123 4567', '+573001234567'],
    ['+34', '612 345 678', '+34612345678'],
  ])('validates priority market %s numbers', (dialCode, national, expected) => {
    expect(normalizePhone(dialCode, national)).toMatchObject({ e164: expected, valid: true });
  });

  it('splits a stored E.164 number and builds an encoded WhatsApp URL', () => {
    expect(splitPhone('+5491123456789')).toMatchObject({ dialCode: '+54', nationalNumber: '91123456789' });
    expect(whatsappUrl('+1 305 555 0100', 'Hola Ana')).toBe('https://wa.me/13055550100?text=Hola%20Ana');
  });

  it('refuses to guess the country for an ambiguous historical number', () => {
    expect(whatsappUrl('55 1234 5678', 'Hola')).toBe('');
  });
});
