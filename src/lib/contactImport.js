import { normalizePhone, splitPhone } from '@/lib/phone';
import { COUNTRY_CODES } from '@/lib/countryCodes';

function countryForIso(iso) {
  return COUNTRY_CODES.find(country => country.iso === iso) || null;
}

function unambiguousIsoForDialCode(dialCode) {
  const matches = [...new Set(COUNTRY_CODES
    .filter(country => country.code === dialCode)
    .map(country => country.iso)
    .filter(Boolean))];
  return matches.length === 1 ? matches[0] : null;
}

function contactName(contact) {
  return String(
    contact.displayName
    || contact.name?.formatted
    || [contact.name?.givenName, contact.name?.middleName, contact.name?.familyName].filter(Boolean).join(' ')
    || 'Contacto sin nombre',
  ).trim().slice(0, 120);
}

function sortedNumbers(phoneNumbers = []) {
  return phoneNumbers
    .filter(number => String(number?.value || '').trim())
    .sort((left, right) => Number(Boolean(right.pref)) - Number(Boolean(left.pref))
      || Number(String(right.type || '').toLowerCase() === 'mobile') - Number(String(left.type || '').toLowerCase() === 'mobile'))
    .map(number => ({
      label: String(number.type || 'Teléfono'),
      raw: String(number.value).trim().slice(0, 80),
    }));
}

export function createImportCandidates(deviceContacts = [], defaultDialCode = '+52', defaultCountryIso = 'MX') {
  return deviceContacts.flatMap((contact, index) => {
    const phoneOptions = sortedNumbers(contact.phoneNumbers);
    if (!phoneOptions.length) return [];
    const parsed = splitPhone(phoneOptions[0].raw, defaultDialCode);
    return [{
      id: String(contact.id || `device_${index}`),
      fullName: contactName(contact),
      phoneOptions,
      phoneIndex: 0,
      dialCode: parsed.dialCode,
      countryIso: phoneOptions[0].raw.startsWith('+')
        ? unambiguousIsoForDialCode(parsed.dialCode)
        : defaultCountryIso,
      countryConfirmed: phoneOptions[0].raw.startsWith('+'),
    }];
  });
}

export function selectImportCandidatePhone(candidate, phoneIndex) {
  const raw = String(candidate.phoneOptions?.[phoneIndex]?.raw || '').trim();
  if (raw.startsWith('+')) {
    const parsed = splitPhone(raw, candidate.dialCode || '+52');
    return {
      phoneIndex,
      dialCode: parsed.dialCode,
      countryIso: unambiguousIsoForDialCode(parsed.dialCode),
      countryConfirmed: true,
    };
  }
  const selectedCountry = countryForIso(candidate.countryIso);
  return {
    phoneIndex,
    dialCode: selectedCountry?.code || candidate.dialCode || '+52',
    countryIso: selectedCountry?.iso || candidate.countryIso || null,
    countryConfirmed: false,
  };
}

export function resolveImportCandidate(candidate) {
  const selectedPhone = candidate.phoneOptions?.[candidate.phoneIndex || 0];
  const raw = String(selectedPhone?.raw || '').trim();
  const selectedCountry = countryForIso(candidate.countryIso);
  const fallbackDialCode = selectedCountry?.code || candidate.dialCode || '+52';
  const parsed = splitPhone(raw, fallbackDialCode);
  const dialCode = raw.startsWith('+') ? parsed.dialCode : fallbackDialCode;
  const normalized = normalizePhone(dialCode, raw);
  const countryIso = raw.startsWith('+')
    ? unambiguousIsoForDialCode(dialCode)
    : selectedCountry?.iso || null;
  return {
    full_name: String(candidate.fullName || '').trim().slice(0, 120),
    phone: normalized.e164,
    country_code: dialCode,
    phone_e164: normalized.e164,
    phone_country_iso: countryIso,
    phone_raw: raw,
    valid: Boolean(
      candidate.fullName?.trim()
      && normalized.valid
      && (raw.startsWith('+') || (
        candidate.countryConfirmed === true
        && Boolean(selectedCountry)
        && selectedCountry.code === dialCode
      ))
    ),
  };
}

function existingE164(contact) {
  if (contact.phone_e164) return contact.phone_e164;
  const raw = String(contact.phone || '').trim();
  if (!raw.startsWith('+')) return '';
  const parsed = splitPhone(raw, contact.country_code || '+52');
  return normalizePhone(parsed.dialCode, raw).e164;
}

export function analyzeContactImports(candidates, selectedIds, existingContacts = []) {
  const selected = new Set(selectedIds);
  const used = new Set(existingContacts.map(existingE164).filter(Boolean));
  const rows = [];
  const statusById = {};

  for (const candidate of candidates) {
    if (!selected.has(candidate.id)) continue;
    const resolved = resolveImportCandidate(candidate);
    if (!resolved.valid) {
      statusById[candidate.id] = 'invalid';
      continue;
    }
    if (used.has(resolved.phone_e164)) {
      statusById[candidate.id] = 'duplicate';
      continue;
    }
    used.add(resolved.phone_e164);
    statusById[candidate.id] = 'ready';
    rows.push(resolved);
  }

  return { rows, statusById };
}
