import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getMe } from '../api/auth';
import type { User } from '../api/types';
import { useAuthStore } from '../store/authStore';

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const;

export function useCurrentUser() {
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const query = useQuery<User>({
    queryKey: [...AUTH_ME_QUERY_KEY, token],
    queryFn: getMe,
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (axios.isAxiosError(query.error) && query.error.response?.status === 401) {
      clearAuth();
    }
  }, [clearAuth, query.error]);

  return query;
}
