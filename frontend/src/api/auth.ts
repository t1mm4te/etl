import { apiClient } from './client';
import type { LoginPayload, RegisterPayload } from './types';
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
