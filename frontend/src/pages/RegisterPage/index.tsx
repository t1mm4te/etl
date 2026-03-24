import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { register as registerUser } from '../../api/auth';
import { AuthShell } from '../../components/AuthShell';
import { Button } from '../../components/Button';
import { PasswordInput } from '../../components/PasswordInput';
import { extractError } from '../../lib/extractError';
import styles from './index.module.scss';
import { useNavigate } from 'react-router-dom';

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'Введите имя').max(150, 'Слишком длинное имя'),
    last_name: z.string().min(1, 'Введите фамилию').max(150, 'Слишком длинная фамилия'),
    username: z.string().min(2, 'Минимум 2 символа'),
    email: z.email('Введите корректный email'),
    password: z.string().min(8, 'Минимум 8 символов'),
    confirmPassword: z.string().min(8, 'Подтвердите пароль'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [errorText, setErrorText] = useState<string>();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterValues) =>
      registerUser({
        username: values.username,
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
      }),
    onSuccess: () => {
      navigate('/login', { state: { registrationSuccess: true } });
    },
    onError: (error) => {
      setErrorText(extractError(error, 'Не удалось зарегистрироваться'));
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(undefined);
    await registerMutation.mutateAsync(values);
  });

  return (
    <AuthShell
      title="Регистрация"
      errorText={errorText}
      footerText="Уже есть аккаунт?"
      footerLinkText="Войти"
      footerTo="/login"
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="first_name">
            Имя
            <input
              {...register('first_name')}
              autoComplete="given-name"
              className={`${styles.input} ${errors.first_name ? styles.invalid : ''}`}
              id="first_name"
              type="text"
            />
            {errors.first_name?.message ? (
              <span className={styles.error}>{errors.first_name.message}</span>
            ) : null}
          </label>

          <label className={styles.label} htmlFor="last_name">
            Фамилия
            <input
              {...register('last_name')}
              autoComplete="family-name"
              className={`${styles.input} ${errors.last_name ? styles.invalid : ''}`}
              id="last_name"
              type="text"
            />
            {errors.last_name?.message ? (
              <span className={styles.error}>{errors.last_name.message}</span>
            ) : null}
          </label>
        </div>

        <label className={styles.label} htmlFor="username">
          Username
          <input
            {...register('username')}
            autoComplete="username"
            className={`${styles.input} ${errors.username ? styles.invalid : ''}`}
            id="username"
            type="text"
          />
          {errors.username?.message ? (
            <span className={styles.error}>{errors.username.message}</span>
          ) : null}
        </label>

        <label className={styles.label} htmlFor="email">
          Email
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
          autoComplete="new-password"
          error={errors.password?.message}
        />

        <PasswordInput
          {...register('confirmPassword')}
          id="confirmPassword"
          label="Подтверждение пароля"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
        />

        <Button disabled={isSubmitting || registerMutation.isPending} type="submit">
          {registerMutation.isPending ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
        </Button>
      </form>
    </AuthShell>
  );
}
