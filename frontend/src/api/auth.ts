import { apiClient } from './client';
import type {
  AvatarResponse,
  LoginPayload,
  ProfileUpdatePayload,
  RegisterPayload,
  ResendCodePayload,
  SetEmailPayload,
  SetPasswordPayload,
  VerifyEmailPayload,
} from './types';
import type { DetailResponse } from './types';
import type { User } from './types';

export const register = async (payload: RegisterPayload) => {
  const response = await apiClient.post('/users/', payload);
  return response.data;
};

export const login = async (payload: LoginPayload) => {
  const response = await apiClient.post('/auth/token/login/', payload);
  return response.data;
};

export const logout = async () => {
  await apiClient.post('/auth/token/logout/');
};

export const getMe = async () => {
  const response = await apiClient.get('/users/me/');
  return response.data as User;
};

export const patchMe = async (payload: ProfileUpdatePayload) => {
  const response = await apiClient.patch('/users/me/', payload);
  return response.data as User;
};

export const putMyAvatar = async (avatarDataUrl: string) => {
  const response = await apiClient.put('/users/me/avatar/', {
    avatar: avatarDataUrl,
  });
  return response.data as AvatarResponse;
};

export const deleteMyAvatar = async () => {
  await apiClient.delete('/users/me/avatar/');
};

export const setPassword = async (payload: SetPasswordPayload) => {
  await apiClient.post('/users/set_password/', payload);
};

export const setEmail = async (payload: SetEmailPayload) => {
  await apiClient.post('/users/set_username/', payload);
};

export const verifyEmail = async (payload: VerifyEmailPayload) => {
  const response = await apiClient.post('/auth/verify-email/', payload);
  return response.data as DetailResponse;
};

export const resendVerificationCode = async (payload: ResendCodePayload) => {
  const response = await apiClient.post('/auth/resend-code/', payload);
  return response.data as DetailResponse;
};
