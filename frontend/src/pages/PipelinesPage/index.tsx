import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { createPipeline, deletePipeline, listPipelines } from '../../api/pipelines';
import { extractError } from '../../lib/extractError';
import trashIcon from '../../assets/node-icons/trash.svg';
import styles from './index.module.scss';

const PIPELINES_QUERY_KEY = ['pipelines'];
const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

type CreatePipelineFormValues = {
  name: string;
  description: string;
};

const formatUpdatedAt = (updatedAt: string) => UPDATED_AT_FORMATTER.format(new Date(updatedAt));

export function PipelinesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState<string>();
  const [deleteErrorText, setDeleteErrorText] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePipelineFormValues>({
    defaultValues: {
      name: 'Новый пайплайн',
      description: '',
    },
  });

  const pipelinesQuery = useQuery({
    queryKey: PIPELINES_QUERY_KEY,
    queryFn: listPipelines,
  });

  const createMutation = useMutation({
    mutationFn: createPipeline,
    onSuccess: async (pipeline) => {
      await queryClient.invalidateQueries({ queryKey: PIPELINES_QUERY_KEY });
      navigate(`/pipelines/${pipeline.id}/editor`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pipelineId: string) => deletePipeline(pipelineId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PIPELINES_QUERY_KEY });
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

  const onDelete = async (pipelineId: string) => {
    setDeleteErrorText(undefined);
    try {
      await deleteMutation.mutateAsync(pipelineId);
    } catch (error) {
      setDeleteErrorText(extractError(error, 'Не удалось удалить пайплайн'));
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Мои пайплайны</h1>
        <p className={styles.headerSubtitle}>
          Создавайте и редактируйте ETL-процессы в визуальном редакторе.
        </p>
      </header>
      <div className={styles.container}>
        <section className={styles.createCard}>
          <h2 className={styles.createCardTitle}>Новый пайплайн</h2>
          <form
            className={styles.formGrid}
            onSubmit={handleSubmit((values) => {
              void onCreate(values);
            })}
          >
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
        <section className={styles.list}>
          {pipelinesQuery.isLoading && <p className={styles.muted}>Загрузка...</p>}
          {pipelinesQuery.isError && (
            <p className={styles.error}>{extractError(pipelinesQuery.error, 'Ошибка загрузки')}</p>
          )}

          {!pipelinesQuery.isLoading && pipelinesQuery.data?.results.length === 0 ? (
            <p className={styles.muted}>У вас пока нет пайплайнов. Создайте первый!</p>
          ) : null}
          {deleteErrorText && <p className={styles.error}>{deleteErrorText}</p>}

          <ul className={styles.items}>
            {pipelinesQuery.data?.results.map((pipeline) => (
              <li className={styles.item} key={pipeline.id}>
                <Link className={styles.itemCard} to={`/pipelines/${pipeline.id}/editor`}>
                  <div className={styles.meta}>
                    <h3 className={styles.pipelineTitle}>{pipeline.name}</h3>
                    <p className={styles.pipelineDescription}>
                      {pipeline.description || 'Без описания'}
                    </p>
                    <div className={styles.badges}>
                      <span>Нод: {pipeline.node_count}</span>
                      <span>Последний запуск: {pipeline.last_run_status ?? '—'}</span>
                      <span>Обновлен: {formatUpdatedAt(pipeline.updated_at)}</span>
                    </div>
                  </div>
                </Link>
                <button
                  className={styles.deleteButton}
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    void onDelete(pipeline.id);
                  }}
                  aria-label={`Удалить пайплайн ${pipeline.name}`}
                  title={`Удалить пайплайн ${pipeline.name}`}
                >
                  <img alt="Удалить" src={trashIcon} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
