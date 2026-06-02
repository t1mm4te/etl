import { describe, expect, it, vi, beforeEach } from 'vitest';

const apiClientMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({
  apiClient: apiClientMock,
}));

import {
  deleteMyAvatar,
  getMe,
  login,
  logout,
  patchMe,
  putMyAvatar,
  register,
  resendVerificationCode,
  setEmail,
  setPassword,
  verifyEmail,
} from './auth';

describe('auth api', () => {
  beforeEach(() => {
    apiClientMock.post.mockReset();
    apiClientMock.get.mockReset();
    apiClientMock.patch.mockReset();
    apiClientMock.put.mockReset();
    apiClientMock.delete.mockReset();
  });

  it('calls the auth endpoints with the expected payloads', async () => {
    apiClientMock.post.mockResolvedValueOnce({ data: { auth_token: 'token' } });
    await expect(login({ email: 'a@b.com', password: 'secret' })).resolves.toEqual({
      auth_token: 'token',
    });
    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/token/login/', {
      email: 'a@b.com',
      password: 'secret',
    });

    apiClientMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(
      register({
        first_name: 'A',
        last_name: 'B',
        username: 'ab',
        email: 'a@b.com',
        password: 'secret',
      })
    ).resolves.toEqual({ ok: true });
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/users/',
      expect.objectContaining({ username: 'ab' })
    );

    apiClientMock.post.mockResolvedValueOnce({ data: { detail: 'ok' } });
    await expect(verifyEmail({ email: 'a@b.com', code: '123456' })).resolves.toEqual({
      detail: 'ok',
    });
    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/verify-email/', {
      email: 'a@b.com',
      code: '123456',
    });

    apiClientMock.post.mockResolvedValueOnce({ data: { detail: 'ok' } });
    await expect(resendVerificationCode({ email: 'a@b.com' })).resolves.toEqual({ detail: 'ok' });
    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/resend-code/', { email: 'a@b.com' });

    apiClientMock.get.mockResolvedValueOnce({ data: { id: 1, email: 'a@b.com', username: 'ab' } });
    await expect(getMe()).resolves.toEqual({ id: 1, email: 'a@b.com', username: 'ab' });
    expect(apiClientMock.get).toHaveBeenCalledWith('/users/me/');

    apiClientMock.patch.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(
      patchMe({ username: 'new-name', first_name: 'A', last_name: 'B' })
    ).resolves.toEqual({ id: 1 });
    expect(apiClientMock.patch).toHaveBeenCalledWith('/users/me/', {
      username: 'new-name',
      first_name: 'A',
      last_name: 'B',
    });

    apiClientMock.put.mockResolvedValueOnce({ data: { avatar: '/media/a.png' } });
    await expect(putMyAvatar('data:image/png;base64,abc')).resolves.toEqual({
      avatar: '/media/a.png',
    });
    expect(apiClientMock.put).toHaveBeenCalledWith('/users/me/avatar/', {
      avatar: 'data:image/png;base64,abc',
    });

    apiClientMock.delete.mockResolvedValueOnce({});
    await expect(deleteMyAvatar()).resolves.toBeUndefined();
    expect(apiClientMock.delete).toHaveBeenCalledWith('/users/me/avatar/');

    apiClientMock.post.mockResolvedValueOnce({});
    await expect(logout()).resolves.toBeUndefined();
    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/token/logout/');

    apiClientMock.post.mockResolvedValueOnce({});
    await expect(
      setPassword({ current_password: 'old', new_password: 'new' })
    ).resolves.toBeUndefined();
    expect(apiClientMock.post).toHaveBeenCalledWith('/users/set_password/', {
      current_password: 'old',
      new_password: 'new',
    });

    apiClientMock.post.mockResolvedValueOnce({});
    await expect(
      setEmail({ current_password: 'old', new_email: 'new@b.com' })
    ).resolves.toBeUndefined();
    expect(apiClientMock.post).toHaveBeenCalledWith('/users/set_username/', {
      current_password: 'old',
      new_email: 'new@b.com',
    });
  });
});
