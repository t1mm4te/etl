import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { setPassword } from '../../../api/auth';
import { Button } from '../../../components/Button';
import { PasswordInput } from '../../../components/PasswordInput';
import { extractError } from '../../../lib/extractError';
import styles from '../index.module.scss';

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

type PasswordValues = z.infer<typeof passwordSchema>;

export function PasswordFormSection() {
  const [errorText, setErrorText] = useState<string>();
  const [successText, setSuccessText] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: setPassword,
    onSuccess: () => {
      setErrorText(undefined);
      setSuccessText('Пароль успешно обновлен');
      reset({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    },
    onError: (mutationError) => {
      setSuccessText(undefined);
      setErrorText(extractError(mutationError, 'Не удалось обновить пароль'));
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(undefined);
    setSuccessText(undefined);

    await mutation.mutateAsync({
      current_password: values.current_password,
      new_password: values.new_password,
    });
  });

  return (
    <article className={styles.card}>
      <h2>Смена пароля</h2>
      <form className={styles.form} onSubmit={onSubmit}>
        <PasswordInput
          {...register('current_password')}
          id="current_password"
          label="Текущий пароль"
          autoComplete="current-password"
          error={errors.current_password?.message}
          disabled={mutation.isPending}
        />

        <PasswordInput
          {...register('new_password')}
          id="new_password"
          label="Новый пароль"
          autoComplete="new-password"
          error={errors.new_password?.message}
          disabled={mutation.isPending}
        />

        <PasswordInput
          {...register('confirm_password')}
          id="confirm_password"
          label="Подтвердите новый пароль"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          disabled={mutation.isPending}
        />

        {errorText ? <p className={styles.error}>{errorText}</p> : null}
        {successText ? <p className={styles.success}>{successText}</p> : null}

        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Обновляем...' : 'Обновить пароль'}
        </Button>
      </form>
    </article>
  );
}
