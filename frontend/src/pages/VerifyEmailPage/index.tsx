import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '../../features/auth/components/AuthShell';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { extractError } from '../../shared/lib/extractError';
import { useVerifyEmail } from '../../features/auth/hooks/useVerifyEmail';
import { useResendCode } from '../../features/auth/hooks/useResendCode';
import styles from './index.module.scss';

const verifySchema = z.object({
  email: z.string().min(1, 'Введите email').email('Введите корректный email'),
  code: z
    .string()
    .min(1, 'Введите код')
    .regex(/^\d{6}$/, 'Введите 6-значный код'),
});

type VerifyValues = z.infer<typeof verifySchema>;

type VerifyEmailLocationState = {
  email?: string;
} | null;

export function VerifyEmailPage() {
  const [errorText, setErrorText] = useState<string>();
  const [successText, setSuccessText] = useState<string>();

  const location = useLocation();
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendCode();

  const initialEmail = useMemo(() => {
    const state = location.state as VerifyEmailLocationState;
    return state?.email ?? '';
  }, [location.state]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: initialEmail,
      code: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(undefined);
    setSuccessText(undefined);

    try {
      await verifyMutation.mutateAsync({
        email: values.email.trim(),
        code: values.code.trim(),
      });
    } catch (error) {
      setErrorText(extractError(error, 'Не удалось подтвердить email'));
    }
  });

  const onResend = async () => {
    setErrorText(undefined);
    setSuccessText(undefined);

    const email = getValues('email')?.trim();

    if (!email) {
      setErrorText('Введите email, чтобы отправить код.');
      return;
    }

    try {
      const data = await resendMutation.mutateAsync({ email });
      setSuccessText(data.detail || 'Новый код отправлен на почту.');
    } catch (error) {
      setErrorText(extractError(error, 'Не удалось отправить код повторно'));
    }
  };

  return (
    <AuthShell
      title="Подтверждение email"
      errorText={errorText}
      successText={successText}
      footerText="Уже подтвердили?"
      footerLinkText="Войти"
      footerTo="/login"
    >
      <form className={styles.form} onSubmit={onSubmit}>
        {initialEmail ? (
          <>
            <input {...register('email')} type="hidden" />
            <p className={styles.sentTo}>
              Код отправлен на <strong>{initialEmail}</strong>. Он действует 10 минут.
            </p>
          </>
        ) : (
          <>
            <p className={styles.hint}>
              Введите почту, которую указали при регистрации. Мы отправили на неё 6-значный код (он
              действует 10 минут).
            </p>

            <label className={styles.label} htmlFor="verify_email">
              Почта
              <Input
                {...register('email')}
                isInvalid={Boolean(errors.email)}
                id="verify_email"
                type="email"
                autoComplete="email"
              />
              {errors.email?.message ? (
                <span className={styles.error}>{errors.email.message}</span>
              ) : null}
            </label>
          </>
        )}

        <label className={styles.label} htmlFor="verify_code">
          Код
          <Input
            {...register('code')}
            isInvalid={Boolean(errors.code)}
            id="verify_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          {errors.code?.message ? (
            <span className={styles.error}>{errors.code.message}</span>
          ) : null}
        </label>

        <div className={styles.actions}>
          <Button disabled={isSubmitting || verifyMutation.isPending} type="submit">
            {verifyMutation.isPending ? 'Проверяем...' : 'Подтвердить'}
          </Button>

          <Button
            disabled={verifyMutation.isPending || resendMutation.isPending}
            type="button"
            color="white"
            onClick={onResend}
          >
            {resendMutation.isPending ? 'Отправляем...' : 'Не пришёл код? Отправить ещё раз'}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
