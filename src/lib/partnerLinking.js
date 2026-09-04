export function normalizePartnerCode(value = '') {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function partnerLinkErrorMessage(error) {
  const detail = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (detail.includes('self_link_not_allowed')) return 'No puedes usar tu propio código.';
  if (detail.includes('partner_code_not_found') || detail.includes('invalid_partner_code')) return 'No encontramos ese código. Revísalo e intenta de nuevo.';
  if (detail.includes('partner_already_linked') || detail.includes('partner_duplicate_link')) return 'Esta cuenta ya está vinculada a otro líder. Para cambiarlo, habla con soporte.';
  if (detail.includes('partner_cycle_detected')) return 'Ese código crearía una relación de equipo inválida. Revisa el código.';
  if (detail.includes('settings_row_missing')) return 'No encontramos tu perfil. Cierra sesión, entra otra vez e intenta de nuevo.';
  if (detail.includes('pgrst202') || detail.includes('does not exist')) return 'Estamos terminando una actualización. Cierra y abre la app, e intenta de nuevo.';
  return 'No pudimos vincular tu cuenta. Tu código sigue aquí. Revisa tu conexión e intenta de nuevo.';
}
