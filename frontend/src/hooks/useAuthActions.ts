import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login, logout } from '../api/auth';
import type { LoginPayload } from '../api/types';
import { useAuthStore } from '../store/authStore';
import { AUTH_ME_QUERY_KEY } from './useCurrentUser';

export function useLoginAction() {
  const setToken = useAuthStore((state) => state.setToken);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async ({ auth_token }) => {
      setToken(auth_token);
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
      navigate('/pipelines');
    },
  });
}

export function useLogoutAction() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
      navigate('/login');
    },
  });
}
