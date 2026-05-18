import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../shared/ui/Button';
import { AuthShell } from '../../components/AuthShell';
import { PasswordInput } from '../../shared/ui/PasswordInput';
import { useLogin } from '../../hooks/useLogin';
import { extractError } from '../../lib/extractError';
import styles from './index.module.scss';

const loginSchema = z.object({
  email: z.string().min(1, 'Введите email').email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [errorText, setErrorText] = useState<string>();
  const location = useLocation();
  const loginMutation = useLogin();

  const state = location.state as {
    registrationSuccess?: boolean;
    emailVerified?: boolean;
    email?: string;
  } | null;

  const successText = state?.emailVerified
    ? 'Почта подтверждена. Теперь можно войти.'
    : state?.registrationSuccess
      ? 'Регистрация успешна. Теперь можно войти.'
      : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: state?.email ?? '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(undefined);
    try {
      await loginMutation.mutateAsync(values);
    } catch (error) {
      setErrorText(extractError(error, 'Не удалось войти'));
    }
  });

  return (
    <AuthShell
      title="Вход"
      errorText={errorText}
      successText={successText}
      footerText="Нет аккаунта?"
      footerLinkText="Зарегистрироваться"
      footerTo="/register"
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label className={styles.label} htmlFor="email">
          Почта
          <input
            {...register('email')}
            autoComplete="email"
            className={`${styles.input} ${errors.email ? styles.invalid : ''}`}
            id="email"
            type="email"
          />
          {errors.email?.message ? (
            <span className={styles.error}>{errors.email.message}</span>
          ) : null}
        </label>

        <PasswordInput
          {...register('password')}
          id="password"
          label="Пароль"
          autoComplete="current-password"
          error={errors.password?.message}
        />

        <Button disabled={isSubmitting || loginMutation.isPending} type="submit">
          {loginMutation.isPending ? 'Входим...' : 'Войти'}
        </Button>
      </form>
    </AuthShell>
  );
}
