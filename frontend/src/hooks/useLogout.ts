import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authMeKey } from '../api/queryKeys';
import { useAuthStore } from '../store/authStore';
import { logout } from '../api/auth';

export function useLogout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: authMeKey });
      navigate('/login');
    },
  });
}
