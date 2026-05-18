import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { verifyEmail } from '../../../api/auth';
import type { VerifyEmailPayload } from '../../../api/types';

type LoginLocationState = {
  email?: string;
  emailVerified?: boolean;
};

export function useVerifyEmail() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) => verifyEmail(payload),
    onSuccess: (_data, variables) => {
      const loginState: LoginLocationState = {
        email: variables.email,
        emailVerified: true,
      };
      navigate('/login', { state: loginState });
    },
  });
}
