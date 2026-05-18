import type { User } from '../shared/api/types';

function pickFirstLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const firstChar = Array.from(trimmed)[0] ?? '';
  return firstChar.toLocaleUpperCase();
}

export function getUserInitials(user?: User | null): string {
  if (!user) {
    return '';
  }

  const first = pickFirstLetter(user.first_name ?? '');
  const last = pickFirstLetter(user.last_name ?? '');
  const username = user.username?.trim() ?? '';
  const email = user.email?.trim() ?? '';

  const fromName = `${first}${last}`.trim();
  if (fromName) {
    return fromName;
  }

  if (username) {
    return Array.from(username).slice(0, 2).join('').toLocaleUpperCase();
  }

  if (email) {
    return Array.from(email).slice(0, 2).join('').toLocaleUpperCase();
  }

  return '';
}
