import { COUNTRY_CODES } from '@/lib/countryCodes';

export default function PhoneField({
  id = 'phone',
  dialCode,
  nationalNumber,
  onDialCodeChange,
  onNationalNumberChange,
  describedBy,
  invalid = false,
}) {
  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor={`${id}-country`}>País</label>
      <select
        id={`${id}-country`}
        value={dialCode}
        onChange={event => onDialCodeChange(event.target.value)}
        className="h-14 w-[7.5rem] shrink-0 rounded-2xl border border-border bg-white px-3 text-[17px] text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        aria-label="Código de país"
      >
        {COUNTRY_CODES.map((country, index) => (
          <option key={`${country.name}-${country.code}-${index}`} value={country.code}>
            {country.flag} {country.code}
          </option>
        ))}
      </select>

      <input
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={nationalNumber}
        onChange={event => onNationalNumberChange(event.target.value)}
        placeholder="55 1234 5678"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="h-14 min-w-0 flex-1 rounded-2xl border border-border bg-white px-4 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
    </div>
  );
}
