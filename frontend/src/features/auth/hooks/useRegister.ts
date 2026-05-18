import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { register as registerUser } from '../../../shared/api/auth';
import type { RegisterPayload } from '../../../shared/api/types';

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),
    onSuccess: (_data, variables) => {
      navigate('/verify-email', { state: { email: variables.email } });
    },
  });
}
