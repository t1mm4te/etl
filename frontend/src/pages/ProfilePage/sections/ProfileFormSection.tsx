import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { deleteMyAvatar, patchMe, putMyAvatar } from '../../../shared/api/auth';
import { authMeKey } from '../../../shared/api/queryKeys';
import { Button } from '../../../shared/ui/Button';
import { extractError } from '../../../shared/lib/extractError';
import { getUserInitials } from '../../../shared/lib/getUserInitials';
import { resolveMediaUrl } from '../../../shared/lib/resolveMediaUrl';
import type { User } from '../../../shared/api/types';
import styles from '../index.module.scss';

const profileSchema = z.object({
  username: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(150, 'Максимум 150 символов')
    .regex(/^[\w.@+-]+$/, 'Допустимы буквы, цифры и символы @/./+/-/_'),
  first_name: z.string().min(1, 'Введите имя').max(30, 'Максимум 30 символов'),
  last_name: z.string().min(1, 'Введите фамилию').max(30, 'Максимум 30 символов'),
});

type ProfileValues = z.infer<typeof profileSchema>;
type ProfileFormSectionProps = {
  user: User | undefined;
};

const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });

export function ProfileFormSection({ user }: ProfileFormSectionProps) {
  const queryClient = useQueryClient();

  const [profileErrorText, setProfileErrorText] = useState<string>();
  const [profileSuccessText, setProfileSuccessText] = useState<string>();
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>();
  const [avatarRemoveRequested, setAvatarRemoveRequested] = useState(false);
  const [avatarErrorText, setAvatarErrorText] = useState<string>();
  const [avatarSuccessText, setAvatarSuccessText] = useState<string>();
  const [erroredAvatarSrc, setErroredAvatarSrc] = useState<string | null>(null);

  const avatarSrc = resolveMediaUrl(user?.avatar);
  const avatarPreviewSrc = avatarRemoveRequested ? null : (avatarDataUrl ?? avatarSrc);
  const initials = getUserInitials(user);
  const avatarHasError = Boolean(avatarPreviewSrc) && erroredAvatarSrc === avatarPreviewSrc;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    reset({
      username: user.username ?? '',
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
    });
  }, [user, reset]);

  const profileMutation = useMutation({
    mutationFn: patchMe,
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

  const onSubmit = handleSubmit(async (values) => {
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

  const isLoading =
    profileMutation.isPending || avatarUploadMutation.isPending || avatarDeleteMutation.isPending;

  return (
    <article className={styles.card}>
      <h2>Профиль</h2>

      <label className={styles.avatarPicker} htmlFor="avatar-file" aria-label="Загрузить аватар">
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
          disabled={isLoading}
        />
      </label>

      {user?.avatar || avatarRemoveRequested ? (
        <Button
          type="button"
          color="white"
          disabled={isLoading}
          onClick={() => void onAvatarDelete()}
        >
          {avatarRemoveRequested ? 'Отменить удаление' : 'Удалить аватар'}
        </Button>
      ) : null}

      {avatarErrorText ? <p className={styles.error}>{avatarErrorText}</p> : null}
      {avatarSuccessText ? <p className={styles.success}>{avatarSuccessText}</p> : null}

      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.label} htmlFor="username">
          Username
          <input
            {...register('username')}
            className={errors.username ? styles.invalid : ''}
            id="username"
            type="text"
            autoComplete="username"
          />
          {errors.username?.message ? (
            <span className={styles.error}>{errors.username.message}</span>
          ) : null}
        </label>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="first_name">
            Имя
            <input
              {...register('first_name')}
              className={errors.first_name ? styles.invalid : ''}
              id="first_name"
              type="text"
              autoComplete="given-name"
            />
            {errors.first_name?.message ? (
              <span className={styles.error}>{errors.first_name.message}</span>
            ) : null}
          </label>

          <label className={styles.label} htmlFor="last_name">
            Фамилия
            <input
              {...register('last_name')}
              className={errors.last_name ? styles.invalid : ''}
              id="last_name"
              type="text"
              autoComplete="family-name"
            />
            {errors.last_name?.message ? (
              <span className={styles.error}>{errors.last_name.message}</span>
            ) : null}
          </label>
        </div>

        {profileErrorText ? <p className={styles.error}>{profileErrorText}</p> : null}
        {profileSuccessText ? <p className={styles.success}>{profileSuccessText}</p> : null}

        <Button disabled={isLoading} type="submit">
          {isLoading ? 'Сохраняем...' : 'Сохранить изменения'}
        </Button>
      </form>
    </article>
  );
}
