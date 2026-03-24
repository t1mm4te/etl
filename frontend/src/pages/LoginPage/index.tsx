import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { AuthShell } from '../../components/AuthShell';
import { PasswordInput } from '../../components/PasswordInput';
import { useLoginAction } from '../../hooks/useAuthActions';
import { extractError } from '../../lib/extractError';
import styles from './index.module.scss';

const loginSchema = z.object({
  email: z.string().min(1, 'Введите username'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [errorText, setErrorText] = useState<string>();
  const location = useLocation();
  const loginMutation = useLoginAction();
  const state = location.state as { registrationSuccess?: boolean } | null;
  const successText = state?.registrationSuccess
    ? 'Регистрация успешна. Теперь можно войти.'
    : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
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
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.label} htmlFor="username">
          Username
          <input
            {...register('email')}
            autoComplete="username"
            className={`${styles.input} ${errors.email ? styles.invalid : ''}`}
            id="email"
            type="text"
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
