function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-419').trim();
}

export function filterContacts(contacts, query, limit = 8) {
  const term = normalize(query);
  if (!term) return [];
  return contacts
    .filter(contact => normalize(`${contact.full_name || ''} ${contact.phone || ''}`).includes(term))
    .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'es'))
    .slice(0, limit);
}
