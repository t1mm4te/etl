import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login } from '../../../shared/api/auth';
import type { LoginPayload } from '../../../shared/api/types';
import { useAuthStore } from '../store/authStore';
import { authMeKey } from '../../../shared/api/queryKeys';

export function useLogin() {
  const setToken = useAuthStore((state) => state.setToken);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async ({ auth_token }) => {
      setToken(auth_token);
      await queryClient.invalidateQueries({ queryKey: authMeKey });
      navigate('/pipelines');
    },
  });
}
