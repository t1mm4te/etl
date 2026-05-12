import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { resendVerificationCode, verifyEmail } from '../../api/auth';
import { AuthShell } from '../../components/AuthShell';
import { Button } from '../../components/Button';
import { extractError } from '../../lib/extractError';
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

type LoginLocationState = {
  email?: string;
  emailVerified?: boolean;
};

export function VerifyEmailPage() {
  const [errorText, setErrorText] = useState<string>();
  const [successText, setSuccessText] = useState<string>();

  const navigate = useNavigate();
  const location = useLocation();

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

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: (_data, variables) => {
      const loginState: LoginLocationState = {
        email: variables.email,
        emailVerified: true,
      };

      navigate('/login', { state: loginState });
    },
    onError: (error) => {
      setSuccessText(undefined);
      setErrorText(extractError(error, 'Не удалось подтвердить email'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationCode,
    onSuccess: (data) => {
      setErrorText(undefined);
      setSuccessText(data.detail || 'Новый код отправлен на почту.');
    },
    onError: (error) => {
      setSuccessText(undefined);
      setErrorText(extractError(error, 'Не удалось отправить код повторно'));
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(undefined);
    setSuccessText(undefined);

    await verifyMutation.mutateAsync({
      email: values.email.trim(),
      code: values.code.trim(),
    });
  });

  const onResend = async () => {
    setErrorText(undefined);
    setSuccessText(undefined);

    const email = getValues('email')?.trim();

    if (!email) {
      setErrorText('Введите email, чтобы отправить код.');
      return;
    }

    await resendMutation.mutateAsync({ email });
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
              <input
                {...register('email')}
                className={`${styles.input} ${errors.email ? styles.invalid : ''}`}
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
          <input
            {...register('code')}
            className={`${styles.input} ${errors.code ? styles.invalid : ''}`}
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
