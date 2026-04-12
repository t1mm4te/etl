import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { patchMe, setEmail, setPassword } from '../../api/auth';
import { Button } from '../../components/Button';
import { PasswordInput } from '../../components/PasswordInput';
import { useCurrentUser, AUTH_ME_QUERY_KEY } from '../../hooks/useCurrentUser';
import { extractError } from '../../lib/extractError';
import styles from './index.module.scss';

const profileSchema = z.object({
  username: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(150, 'Максимум 150 символов')
    .regex(/^[\w.@+-]+$/, 'Допустимы буквы, цифры и символы @/./+/-/_'),
  first_name: z.string().min(1, 'Введите имя').max(30, 'Максимум 30 символов'),
  last_name: z.string().min(1, 'Введите фамилию').max(30, 'Максимум 30 символов'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Введите текущий пароль'),
    new_password: z.string().min(8, 'Минимум 8 символов'),
    confirm_password: z.string().min(8, 'Подтвердите новый пароль'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'Пароли не совпадают',
    path: ['confirm_password'],
  });

const emailSchema = z.object({
  new_email: z.email('Введите корректный email'),
  current_password: z.string().min(1, 'Введите текущий пароль'),
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;
type EmailValues = z.infer<typeof emailSchema>;

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError, error } = useCurrentUser();

  const [profileErrorText, setProfileErrorText] = useState<string>();
  const [passwordErrorText, setPasswordErrorText] = useState<string>();
  const [emailErrorText, setEmailErrorText] = useState<string>();

  const [profileSuccessText, setProfileSuccessText] = useState<string>();
  const [passwordSuccessText, setPasswordSuccessText] = useState<string>();
  const [emailSuccessText, setEmailSuccessText] = useState<string>();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    reset: resetEmail,
    formState: { errors: emailErrors },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      new_email: '',
      current_password: '',
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    resetProfile({
      username: user.username ?? '',
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
    });

    resetEmail({
      new_email: user.email ?? '',
      current_password: '',
    });
  }, [user, resetProfile, resetEmail]);

  const profileMutation = useMutation({
    mutationFn: patchMe,
    onSuccess: async () => {
      setProfileErrorText(undefined);
      setProfileSuccessText('Профиль обновлен');
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
    onError: (mutationError) => {
      setProfileSuccessText(undefined);
      setProfileErrorText(extractError(mutationError, 'Не удалось обновить профиль'));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: setPassword,
    onSuccess: () => {
      setPasswordErrorText(undefined);
      setPasswordSuccessText('Пароль успешно обновлен');
      resetPassword({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    },
    onError: (mutationError) => {
      setPasswordSuccessText(undefined);
      setPasswordErrorText(extractError(mutationError, 'Не удалось обновить пароль'));
    },
  });

  const emailMutation = useMutation({
    mutationFn: setEmail,
    onSuccess: async () => {
      setEmailErrorText(undefined);
      setEmailSuccessText('Email успешно обновлен');
      resetEmail({
        new_email: '',
        current_password: '',
      });
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
    onError: (mutationError) => {
      setEmailSuccessText(undefined);
      setEmailErrorText(extractError(mutationError, 'Не удалось обновить email'));
    },
  });

  const onSubmitProfile = handleSubmitProfile(async (values) => {
    setProfileErrorText(undefined);
    setProfileSuccessText(undefined);

    await profileMutation.mutateAsync({
      username: values.username.trim(),
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
    });
  });

  const onSubmitPassword = handleSubmitPassword(async (values) => {
    setPasswordErrorText(undefined);
    setPasswordSuccessText(undefined);

    await passwordMutation.mutateAsync({
      current_password: values.current_password,
      new_password: values.new_password,
    });
  });

  const onSubmitEmail = handleSubmitEmail(async (values) => {
    setEmailErrorText(undefined);
    setEmailSuccessText(undefined);

    await emailMutation.mutateAsync({
      new_email: values.new_email.trim(),
      current_password: values.current_password,
    });
  });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Профиль пользователя</h1>
        <p className={styles.subtitle}>
          Управляйте персональными данными и безопасностью аккаунта.
        </p>
      </header>

      {isLoading ? <p className={styles.muted}>Загрузка профиля...</p> : null}
      {isError ? (
        <p className={styles.error}>{extractError(error, 'Ошибка загрузки профиля')}</p>
      ) : null}

      {!isLoading && !isError ? (
        <div className={styles.grid}>
          <article className={`${styles.card} ${styles.cardPrimary}`}>
            <h2>Основные данные</h2>
            <form className={styles.form} onSubmit={onSubmitProfile}>
              <label className={styles.label} htmlFor="username">
                Username
                <input
                  {...registerProfile('username')}
                  className={profileErrors.username ? styles.invalid : ''}
                  id="username"
                  type="text"
                  autoComplete="username"
                />
                {profileErrors.username?.message ? (
                  <span className={styles.error}>{profileErrors.username.message}</span>
                ) : null}
              </label>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="first_name">
                  Имя
                  <input
                    {...registerProfile('first_name')}
                    className={profileErrors.first_name ? styles.invalid : ''}
                    id="first_name"
                    type="text"
                    autoComplete="given-name"
                  />
                  {profileErrors.first_name?.message ? (
                    <span className={styles.error}>{profileErrors.first_name.message}</span>
                  ) : null}
                </label>

                <label className={styles.label} htmlFor="last_name">
                  Фамилия
                  <input
                    {...registerProfile('last_name')}
                    className={profileErrors.last_name ? styles.invalid : ''}
                    id="last_name"
                    type="text"
                    autoComplete="family-name"
                  />
                  {profileErrors.last_name?.message ? (
                    <span className={styles.error}>{profileErrors.last_name.message}</span>
                  ) : null}
                </label>
              </div>

              {profileErrorText ? <p className={styles.error}>{profileErrorText}</p> : null}
              {profileSuccessText ? <p className={styles.success}>{profileSuccessText}</p> : null}

              <Button disabled={profileMutation.isPending} type="submit">
                {profileMutation.isPending ? 'Сохраняем...' : 'Сохранить изменения'}
              </Button>
            </form>
          </article>

          <article className={styles.card}>
            <h2>Смена пароля</h2>
            <form className={styles.form} onSubmit={onSubmitPassword}>
              <PasswordInput
                {...registerPassword('current_password')}
                id="current_password"
                label="Текущий пароль"
                autoComplete="current-password"
                error={passwordErrors.current_password?.message}
                disabled={passwordMutation.isPending}
              />

              <PasswordInput
                {...registerPassword('new_password')}
                id="new_password"
                label="Новый пароль"
                autoComplete="new-password"
                error={passwordErrors.new_password?.message}
                disabled={passwordMutation.isPending}
              />

              <PasswordInput
                {...registerPassword('confirm_password')}
                id="confirm_password"
                label="Подтвердите новый пароль"
                autoComplete="new-password"
                error={passwordErrors.confirm_password?.message}
                disabled={passwordMutation.isPending}
              />

              {passwordErrorText ? <p className={styles.error}>{passwordErrorText}</p> : null}
              {passwordSuccessText ? <p className={styles.success}>{passwordSuccessText}</p> : null}

              <Button disabled={passwordMutation.isPending} type="submit">
                {passwordMutation.isPending ? 'Обновляем...' : 'Обновить пароль'}
              </Button>
            </form>
          </article>

          <article className={styles.card}>
            <h2>Смена email</h2>
            <p className={styles.hint}>Текущий email: {user?.email ?? 'не указан'}</p>
            <form className={styles.form} onSubmit={onSubmitEmail}>
              <label className={styles.label} htmlFor="new_email">
                Новый email
                <input
                  {...registerEmail('new_email')}
                  className={emailErrors.new_email ? styles.invalid : ''}
                  id="new_email"
                  type="email"
                  autoComplete="email"
                />
                {emailErrors.new_email?.message ? (
                  <span className={styles.error}>{emailErrors.new_email.message}</span>
                ) : null}
              </label>

              <PasswordInput
                {...registerEmail('current_password')}
                id="email_current_password"
                label="Текущий пароль"
                autoComplete="current-password"
                error={emailErrors.current_password?.message}
                disabled={emailMutation.isPending}
              />

              {emailErrorText ? <p className={styles.error}>{emailErrorText}</p> : null}
              {emailSuccessText ? <p className={styles.success}>{emailSuccessText}</p> : null}

              <Button disabled={emailMutation.isPending} type="submit">
                {emailMutation.isPending ? 'Обновляем...' : 'Обновить email'}
              </Button>
            </form>
          </article>
        </div>
      ) : null}
    </section>
  );
}
