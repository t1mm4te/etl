import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { deleteMyAvatar, patchMe, putMyAvatar, setEmail, setPassword } from '../../api/auth';
import { Button } from '../../components/Button';
import { PasswordInput } from '../../components/PasswordInput';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { authMeKey } from '../../api/queryKeys';
import { extractError } from '../../lib/extractError';
import { getUserInitials } from '../../lib/getUserInitials';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
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

const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError, error } = useCurrentUser();

  const [profileErrorText, setProfileErrorText] = useState<string>();
  const [passwordErrorText, setPasswordErrorText] = useState<string>();
  const [emailErrorText, setEmailErrorText] = useState<string>();

  const [profileSuccessText, setProfileSuccessText] = useState<string>();
  const [passwordSuccessText, setPasswordSuccessText] = useState<string>();
  const [emailSuccessText, setEmailSuccessText] = useState<string>();

  const [avatarDataUrl, setAvatarDataUrl] = useState<string>();
  const [avatarRemoveRequested, setAvatarRemoveRequested] = useState(false);
  const [avatarErrorText, setAvatarErrorText] = useState<string>();
  const [avatarSuccessText, setAvatarSuccessText] = useState<string>();
  const [erroredAvatarSrc, setErroredAvatarSrc] = useState<string | null>(null);

  const avatarSrc = resolveMediaUrl(user?.avatar);
  const avatarPreviewSrc = avatarRemoveRequested ? null : (avatarDataUrl ?? avatarSrc);
  const initials = getUserInitials(user);
  const avatarHasError = Boolean(avatarPreviewSrc) && erroredAvatarSrc === avatarPreviewSrc;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.readAsDataURL(file);
    });

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
      new_email: '',
      current_password: '',
    });
  }, [user, resetProfile, resetEmail]);

  const profileMutation = useMutation({
    mutationFn: patchMe,
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
      await queryClient.invalidateQueries({ queryKey: authMeKey });
    },
    onError: (mutationError) => {
      setEmailSuccessText(undefined);
      setEmailErrorText(extractError(mutationError, 'Не удалось обновить email'));
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: putMyAvatar,
  });

  const avatarDeleteMutation = useMutation({
    mutationFn: deleteMyAvatar,
  });

  const onAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setAvatarErrorText(undefined);
    setAvatarSuccessText(undefined);
    setErroredAvatarSrc(null);
    setAvatarRemoveRequested(false);

    if (file.type === 'image/svg+xml') {
      setAvatarDataUrl(undefined);
      setAvatarErrorText('SVG не поддерживается. Загрузите PNG/JPG/WebP/GIF.');
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
      setAvatarDataUrl(undefined);
      setAvatarErrorText('Неподдерживаемый формат. Загрузите PNG/JPG/WebP/GIF.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarDataUrl(dataUrl);
    } catch (uploadError) {
      setAvatarDataUrl(undefined);
      if (uploadError instanceof Error && uploadError.message) {
        setAvatarErrorText(uploadError.message);
        return;
      }
      setAvatarErrorText('Не удалось загрузить аватар');
    }
  };

  const onAvatarDelete = async () => {
    setAvatarErrorText(undefined);
    setAvatarSuccessText(undefined);
    setAvatarDataUrl(undefined);
    setErroredAvatarSrc(null);
    setAvatarRemoveRequested((prev) => !prev);
  };

  const onSubmitProfile = handleSubmitProfile(async (values) => {
    setProfileErrorText(undefined);
    setProfileSuccessText(undefined);
    setAvatarErrorText(undefined);
    setAvatarSuccessText(undefined);

    try {
      await profileMutation.mutateAsync({
        username: values.username.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
      });
      setProfileSuccessText('Профиль обновлен');
    } catch (mutationError) {
      setProfileErrorText(extractError(mutationError, 'Не удалось обновить профиль'));
      return;
    }

    if (avatarRemoveRequested && user?.avatar) {
      try {
        await avatarDeleteMutation.mutateAsync();
        setAvatarSuccessText('Аватар удален');
        setAvatarRemoveRequested(false);
      } catch (mutationError) {
        setAvatarErrorText(extractError(mutationError, 'Не удалось удалить аватар'));
      }
    }

    if (!avatarRemoveRequested && avatarDataUrl) {
      try {
        await avatarUploadMutation.mutateAsync(avatarDataUrl);
        setAvatarSuccessText('Аватар обновлен');
        setAvatarDataUrl(undefined);
      } catch (mutationError) {
        setAvatarErrorText(extractError(mutationError, 'Не удалось обновить аватар'));
      }
    }

    await queryClient.invalidateQueries({ queryKey: authMeKey });
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
      {isLoading ? <p className={styles.muted}>Загрузка профиля...</p> : null}
      {isError ? (
        <p className={styles.error}>{extractError(error, 'Ошибка загрузки профиля')}</p>
      ) : null}

      {!isLoading && !isError ? (
        <div className={styles.layout}>
          <article className={styles.card}>
            <h2>Профиль</h2>

            <label
              className={styles.avatarPicker}
              htmlFor="avatar-file"
              aria-label="Загрузить аватар"
            >
              <div className={styles.avatarPreview}>
                {avatarPreviewSrc && !avatarHasError ? (
                  <img
                    className={styles.avatarImage}
                    src={avatarPreviewSrc}
                    alt=""
                    onError={() => setErroredAvatarSrc(avatarPreviewSrc)}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder} aria-hidden="true">
                    <span className={styles.avatarInitials}>{initials}</span>
                  </div>
                )}
              </div>
              <p className={styles.avatarHint}>
                {avatarRemoveRequested
                  ? 'Аватар будет удален после сохранения'
                  : avatarDataUrl
                    ? 'Аватар будет обновлен после сохранения'
                    : 'Нажмите, чтобы загрузить фото'}
              </p>
              <input
                id="avatar-file"
                className={styles.avatarInput}
                type="file"
                accept={ALLOWED_AVATAR_TYPES.join(',')}
                onChange={onAvatarFileChange}
                disabled={
                  profileMutation.isPending ||
                  avatarUploadMutation.isPending ||
                  avatarDeleteMutation.isPending
                }
              />
            </label>

            {user?.avatar || avatarRemoveRequested ? (
              <Button
                type="button"
                color="white"
                disabled={
                  profileMutation.isPending ||
                  avatarUploadMutation.isPending ||
                  avatarDeleteMutation.isPending
                }
                onClick={() => void onAvatarDelete()}
              >
                {avatarRemoveRequested ? 'Отменить удаление' : 'Удалить аватар'}
              </Button>
            ) : null}

            {avatarErrorText ? <p className={styles.error}>{avatarErrorText}</p> : null}
            {avatarSuccessText ? <p className={styles.success}>{avatarSuccessText}</p> : null}

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

          <div className={styles.rightColumn}>
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
                {passwordSuccessText ? (
                  <p className={styles.success}>{passwordSuccessText}</p>
                ) : null}

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
        </div>
      ) : null}
    </section>
  );
}
