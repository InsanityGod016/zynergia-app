export function deviceTimezone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone || typeof timezone !== 'string') return null;
    // Validate the identifier before it reaches the notification scheduler.
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return timezone;
  } catch {
    return null;
  }
}
