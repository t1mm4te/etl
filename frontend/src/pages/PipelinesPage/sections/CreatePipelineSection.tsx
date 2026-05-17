import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { createPipeline } from '../../../api/pipelines';
import { extractError } from '../../../lib/extractError';
import styles from '../index.module.scss';
import { pipelinesListKey } from '../../../api/queryKeys';

type CreatePipelineFormValues = {
  name: string;
  description: string;
};

export function CreatePipelineSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePipelineFormValues>({
    defaultValues: { name: 'Новый пайплайн', description: '' },
  });

  const createMutation = useMutation({
    mutationFn: createPipeline,
    onSuccess: async (pipeline) => {
      await queryClient.invalidateQueries({ queryKey: pipelinesListKey });
      navigate(`/pipelines/${pipeline.id}/editor`);
    },
  });

  const onCreate = async (values: CreatePipelineFormValues) => {
    setErrorText(undefined);
    try {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim(),
      });
    } catch (error) {
      setErrorText(extractError(error, 'Не удалось создать пайплайн'));
    }
  };

  return (
    <section className={styles.createCard}>
      <h2 className={styles.createCardTitle}>Новый пайплайн</h2>
      <form className={styles.formGrid} onSubmit={handleSubmit((values) => void onCreate(values))}>
        <label className={styles.label}>
          Название
          <input
            {...register('name', {
              required: 'Введите название пайплайна',
              validate: (value) => value.trim().length > 0 || 'Введите название пайплайна',
            })}
          />
        </label>

        <label className={styles.label}>
          Описание
          <textarea
            {...register('description')}
            placeholder="Кратко опишите, какие данные и как будут обрабатываться"
            rows={5}
          />
        </label>

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Создаём...' : 'Создать новый пайплайн'}
        </Button>
      </form>
      {errors.name?.message && <p className={styles.error}>{errors.name.message}</p>}
      {errorText && <p className={styles.error}>{errorText}</p>}
    </section>
  );
}
