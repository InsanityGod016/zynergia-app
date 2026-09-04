import { describe, expect, it } from 'vitest';
import { filterContacts } from '../../src/lib/contactSearch.js';

describe('template contact search', () => {
  const contacts = [
    { id: '1', full_name: 'Álvaro Gómez', phone: '+52 55 1234' },
    { id: '2', full_name: 'Beatriz Luna', phone: '+57 300 9876' },
  ];

  it('finds contacts by name without accents or by phone', () => {
    expect(filterContacts(contacts, 'alvaro').map(contact => contact.id)).toEqual(['1']);
    expect(filterContacts(contacts, '300 9876').map(contact => contact.id)).toEqual(['2']);
  });
});
