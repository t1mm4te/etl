import { describe, expect, it } from 'vitest';
import { getUserInitials } from './getUserInitials';

describe('getUserInitials', () => {
  it('returns initials from first and last name', () => {
    expect(
      getUserInitials({
        id: 1,
        email: 'anna@example.com',
        username: 'anna',
        first_name: 'Anna',
        last_name: 'Ivanova',
      })
    ).toBe('AI');
  });

  it('falls back to username and email when names are missing', () => {
    expect(
      getUserInitials({
        id: 1,
        email: 'polina@example.com',
        username: 'polina',
      })
    ).toBe('PO');

    expect(
      getUserInitials({
        id: 1,
        email: 'elena@example.com',
        username: '',
      })
    ).toBe('EL');
  });

  it('returns an empty string when nothing is available', () => {
    expect(getUserInitials(null)).toBe('');
  });
});
