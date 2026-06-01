import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('hydrates from localStorage', async () => {
    localStorage.setItem('auth_token', 'token-from-storage');

    const { useAuthStore } = await import('./authStore');

    expect(useAuthStore.getState().token).toBe('token-from-storage');
    expect(useAuthStore.getState().isAuthorized).toBe(true);
  });

  it('persists token updates and clears auth', async () => {
    const { useAuthStore } = await import('./authStore');

    useAuthStore.getState().setToken('new-token');
    expect(localStorage.getItem('auth_token')).toBe('new-token');
    expect(useAuthStore.getState().isAuthorized).toBe(true);

    useAuthStore.getState().clearAuth();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(useAuthStore.getState().isAuthorized).toBe(false);
  });
});