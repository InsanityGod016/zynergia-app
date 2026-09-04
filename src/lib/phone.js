import { COUNTRY_CODES } from '@/lib/countryCodes';

export function digitsOnly(value = '') {
  return String(value).replace(/\D/g, '');
}

const NATIONAL_RULES = {
  '1': { lengths: [10] },
  '34': { lengths: [9] },
  '51': { lengths: [9] },
  '52': { lengths: [10] },
  '54': { lengths: [11], startsWith: '9' },
  '56': { lengths: [9] },
  '57': { lengths: [10] },
  '58': { lengths: [10] },
};

function matchesNationalRule(dialDigits, nationalDigits) {
  const rule = NATIONAL_RULES[dialDigits];
  if (!rule) return nationalDigits.length >= 7 && `${dialDigits}${nationalDigits}`.length <= 15;
  return rule.lengths.includes(nationalDigits.length)
    && (!rule.startsWith || nationalDigits.startsWith(rule.startsWith));
}

function normalizeNationalDigits(dialDigits, nationalDigits) {
  let digits = nationalDigits;
  if (dialDigits === '52' && digits.length === 11 && digits.startsWith('1')) {
    // México retiró el antiguo prefijo móvil internacional “1”.
    digits = digits.slice(1);
  }
  if (dialDigits === '54' && digits.length === 10) {
    // Para WhatsApp, un móvil argentino necesita el 9 internacional.
    digits = `9${digits}`;
  }
  return digits;
}

function splitKnownDialCode(e164Digits) {
  const dialCodes = [...new Set(COUNTRY_CODES.map(item => digitsOnly(item.code)))]
    .sort((left, right) => right.length - left.length);
  const dialDigits = dialCodes.find(code => e164Digits.startsWith(code));
  if (!dialDigits) return null;
  return { dialDigits, nationalDigits: e164Digits.slice(dialDigits.length) };
}

export function normalizePhone(dialCode, nationalNumber) {
  const dialDigits = digitsOnly(dialCode);
  const raw = String(nationalNumber || '').trim();
  let digits = digitsOnly(raw);

  if (!digits) return { e164: '', nationalNumber: '', valid: false };

  if (raw.startsWith('+')) {
    if (!dialDigits || !digits.startsWith(dialDigits)) {
      return { e164: '', nationalNumber: digits, valid: false };
    }
    let nationalDigits = digits.slice(dialDigits.length);
    nationalDigits = normalizeNationalDigits(dialDigits, nationalDigits);
    const valid = matchesNationalRule(dialDigits, nationalDigits);
    return {
      e164: valid ? `+${dialDigits}${nationalDigits}` : '',
      nationalNumber: nationalDigits,
      valid,
    };
  }

  // Pegar "+52 55..." o "52 55..." no debe producir +5252...
  if (dialDigits && digits.startsWith(dialDigits) && matchesNationalRule(dialDigits, normalizeNationalDigits(dialDigits, digits.slice(dialDigits.length)))) {
    digits = digits.slice(dialDigits.length);
  }

  digits = normalizeNationalDigits(dialDigits, digits);
  const complete = `${dialDigits}${digits}`;
  const valid = matchesNationalRule(dialDigits, digits) && complete.length <= 15;
  return {
    e164: valid ? `+${complete}` : '',
    nationalNumber: digits,
    valid,
  };
}

export function splitPhone(value, preferredDialCode = '+52') {
  const raw = String(value || '').trim();
  const digits = digitsOnly(raw);
  if (!digits) return { dialCode: preferredDialCode, nationalNumber: '', ambiguous: false };

  if (raw.startsWith('+')) {
    const dialCodes = [...new Set(COUNTRY_CODES.map(item => item.code))]
      .sort((a, b) => digitsOnly(b).length - digitsOnly(a).length);
    const dialCode = dialCodes.find(code => digits.startsWith(digitsOnly(code))) || preferredDialCode;
    return {
      dialCode,
      nationalNumber: digits.slice(digitsOnly(dialCode).length),
      ambiguous: false,
    };
  }

  return { dialCode: preferredDialCode, nationalNumber: digits, ambiguous: true };
}

export function whatsappUrl(e164, message = '') {
  if (!String(e164 || '').trim().startsWith('+')) return '';
  const digits = digitsOnly(e164);
  if (digits.length < 8 || digits.length > 15) return '';
  const split = splitKnownDialCode(digits);
  if (split && !matchesNationalRule(split.dialDigits, split.nationalDigits)) return '';
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
