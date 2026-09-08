import { describe, expect, it } from 'vitest';
import { templatesForCategory } from '../../src/lib/templateSharing';

describe('template sharing', () => {
  const templates = [
    {
      id: 'private-template-id',
      user_id: 'private-user-id',
      name: 'Invitación',
      content: 'Hola {{contact.full_name}}',
      situation: 'business',
      tone: 'amigable',
      category_id: 'doctors',
      contact_id: 'private-contact-id',
      is_default: true,
    },
  ];

  it('selects a custom category or a canonical situation', () => {
    const other = { id: 'other', situation: 'repurchase' };
    expect(templatesForCategory([...templates, other], 'custom:doctors')).toEqual(templates);
    expect(templatesForCategory([...templates, other], 'situation:repurchase')).toEqual([other]);
  });
});
