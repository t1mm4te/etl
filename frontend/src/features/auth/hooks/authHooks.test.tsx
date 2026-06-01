import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

const authApiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerificationCode: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../../shared/api/auth', () => authApiMocks);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => authApiMocks.navigate,
  };
});

import { useCurrentUser } from './useCurrentUser';
import { useLogin } from './useLogin';
import { useLogout } from './useLogout';
import { useRegister } from './useRegister';
import { useResendCode } from './useResendCode';
import { useVerifyEmail } from './useVerifyEmail';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  queryClient.invalidateQueries = vi.fn().mockResolvedValue(undefined) as never;
  queryClient.removeQueries = vi.fn() as never;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe('auth hooks', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
    authApiMocks.login.mockReset();
    authApiMocks.register.mockReset();
    authApiMocks.logout.mockReset();
    authApiMocks.getMe.mockReset();
    authApiMocks.verifyEmail.mockReset();
    authApiMocks.resendVerificationCode.mockReset();
    authApiMocks.navigate.mockReset();
  });

  it('logs in, stores the token and navigates to pipelines', async () => {
    const { wrapper, queryClient } = createWrapper();
    authApiMocks.login.mockResolvedValue({ auth_token: 'token-1' });

    const { result } = renderHook(() => useLogin(), { wrapper });

    await result.current.mutateAsync({ email: 'a@b.com', password: 'secret' });

    expect(useAuthStore.getState().token).toBe('token-1');
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(authApiMocks.navigate).toHaveBeenCalledWith('/pipelines');
  });

  it('registers and navigates to email verification', async () => {
    const { wrapper } = createWrapper();
    authApiMocks.register.mockResolvedValue({});

    const { result } = renderHook(() => useRegister(), { wrapper });

    await result.current.mutateAsync({
      first_name: 'A',
      last_name: 'B',
      username: 'ab',
      email: 'a@b.com',
      password: 'secret',
    });

    expect(authApiMocks.navigate).toHaveBeenCalledWith('/verify-email', {
      state: { email: 'a@b.com' },
    });
  });

  it('verifies email and redirects to login with state', async () => {
    const { wrapper } = createWrapper();
    authApiMocks.verifyEmail.mockResolvedValue({ detail: 'ok' });

    const { result } = renderHook(() => useVerifyEmail(), { wrapper });

    await result.current.mutateAsync({ email: 'a@b.com', code: '123456' });

    expect(authApiMocks.navigate).toHaveBeenCalledWith('/login', {
      state: { email: 'a@b.com', emailVerified: true },
    });
  });

  it('resends verification code', async () => {
    const { wrapper } = createWrapper();
    authApiMocks.resendVerificationCode.mockResolvedValue({ detail: 'sent' });

    const { result } = renderHook(() => useResendCode(), { wrapper });

    await expect(result.current.mutateAsync({ email: 'a@b.com' })).resolves.toEqual({ detail: 'sent' });
    expect(authApiMocks.resendVerificationCode).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('logs out and clears auth state', async () => {
    const { wrapper, queryClient } = createWrapper();
    useAuthStore.getState().setToken('token-1');
    authApiMocks.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper });

    await result.current.mutateAsync();

    expect(useAuthStore.getState().isAuthorized).toBe(false);
    expect(queryClient.removeQueries).toHaveBeenCalled();
    expect(authApiMocks.navigate).toHaveBeenCalledWith('/login');
  });

  it('loads current user and clears auth on 401', async () => {
    const { wrapper } = createWrapper();
    useAuthStore.getState().setToken('token-1');
    authApiMocks.getMe.mockResolvedValue({ id: 1, email: 'a@b.com', username: 'ab' });

    const successResult = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(successResult.result.current.isSuccess).toBe(true));
    expect(authApiMocks.getMe).toHaveBeenCalled();

    useAuthStore.getState().setToken('token-2');
    authApiMocks.getMe.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(useAuthStore.getState().isAuthorized).toBe(false));
  });
});