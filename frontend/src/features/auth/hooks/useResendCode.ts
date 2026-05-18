import { useMutation } from '@tanstack/react-query';
import { resendVerificationCode } from '../../../shared/api/auth';
import type { ResendCodePayload } from '../../../shared/api/types';

export function useResendCode() {
  return useMutation({
    mutationFn: (payload: ResendCodePayload) => resendVerificationCode(payload),
  });
}
