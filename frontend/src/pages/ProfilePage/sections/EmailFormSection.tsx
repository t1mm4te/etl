import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { setEmail } from '../../../api/auth';
import { authMeKey } from '../../../api/queryKeys';
import { Button } from '../../../shared/ui/Button';
import { PasswordInput } from '../../../shared/ui/PasswordInput';
import { extractError } from '../../../lib/extractError';
import type { User } from '../../../api/types';
import styles from '../index.module.scss';

const emailSchema = z.object({
  new_email: z.email('Введите корректный email'),
  current_password: z.string().min(1, 'Введите текущий пароль'),
});

type EmailValues = z.infer<typeof emailSchema>;

type EmailFormSectionProps = {
  user: User | undefined;
};

export function EmailFormSection({ user }: EmailFormSectionProps) {
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState<string>();
  const [successText, setSuccessText] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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

    reset({
      new_email: '',
      current_password: '',
    });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: setEmail,
    onSuccess: async () => {
      setErrorText(undefined);
      setSuccessText('Email успешно обновлен');
      reset({
        new_email: '',
        current_password: '',
      });
      await queryClient.invalidateQueries({ queryKey: authMeKey });
    },
    onError: (mutationError) => {
      setSuccessText(undefined);
      setErrorText(extractError(mutationError, 'Не удалось обновить email'));
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(undefined);
    setSuccessText(undefined);

    await mutation.mutateAsync({
      new_email: values.new_email.trim(),
      current_password: values.current_password,
    });
  });

  return (
    <article className={styles.card}>
      <h2>Смена email</h2>
      <p className={styles.hint}>Текущий email: {user?.email ?? 'не указан'}</p>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.label} htmlFor="new_email">
          Новый email
          <input
            {...register('new_email')}
            className={errors.new_email ? styles.invalid : ''}
            id="new_email"
            type="email"
            autoComplete="email"
          />
          {errors.new_email?.message ? (
            <span className={styles.error}>{errors.new_email.message}</span>
          ) : null}
        </label>

        <PasswordInput
          {...register('current_password')}
          id="email_current_password"
          label="Текущий пароль"
          autoComplete="current-password"
          error={errors.current_password?.message}
          disabled={mutation.isPending}
        />

        {errorText ? <p className={styles.error}>{errorText}</p> : null}
        {successText ? <p className={styles.success}>{successText}</p> : null}

        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Обновляем...' : 'Обновить email'}
        </Button>
      </form>
    </article>
  );
}
