import { useMutation } from '@tanstack/react-query';
import { resendVerificationCode } from '../api/auth';
import type { ResendCodePayload } from '../api/types';

export function useResendCode() {
  return useMutation({
    mutationFn: (payload: ResendCodePayload) => resendVerificationCode(payload),
  });
}
