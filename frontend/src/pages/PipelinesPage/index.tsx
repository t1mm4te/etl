import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { createPipeline, deletePipeline, listPipelines, patchPipeline } from '../../api/pipelines';
import type { PipelineListItem } from '../../api/types';
import { extractError } from '../../lib/extractError';
import trashIcon from '../../assets/node-icons/trash.svg';
import editIcon from '../../assets/node-icons/edit.svg';
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
  const [updateErrorText, setUpdateErrorText] = useState<string>();
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    formState: { errors: createErrors },
  } = useForm<CreatePipelineFormValues>({
    defaultValues: {
      name: 'Новый пайплайн',
      description: '',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<CreatePipelineFormValues>({
    defaultValues: {
      name: '',
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

  const updateMutation = useMutation({
    mutationFn: ({
      pipelineId,
      name,
      description,
    }: {
      pipelineId: string;
      name: string;
      description: string;
    }) =>
      patchPipeline(pipelineId, {
        name,
        description,
      }),
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

  const onStartEdit = (pipeline: PipelineListItem) => {
    setDeleteErrorText(undefined);
    setUpdateErrorText(undefined);
    setEditingPipelineId(pipeline.id);
    resetEditForm({
      name: pipeline.name,
      description: pipeline.description ?? '',
    });
  };

  const onCancelEdit = () => {
    setEditingPipelineId(null);
    setUpdateErrorText(undefined);
    resetEditForm({
      name: '',
      description: '',
    });
  };

  const onSaveEdit = async (pipelineId: string, values: CreatePipelineFormValues) => {
    setUpdateErrorText(undefined);

    try {
      await updateMutation.mutateAsync({
        pipelineId,
        name: values.name.trim(),
        description: values.description.trim(),
      });
      setEditingPipelineId(null);
    } catch (error) {
      setUpdateErrorText(extractError(error, 'Не удалось обновить пайплайн'));
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
            onSubmit={handleCreateSubmit((values) => {
              void onCreate(values);
            })}
          >
            <label className={styles.label}>
              Название
              <input
                {...registerCreate('name', {
                  required: 'Введите название пайплайна',
                  validate: (value) => value.trim().length > 0 || 'Введите название пайплайна',
                })}
              />
            </label>

            <label className={styles.label}>
              Описание
              <textarea
                {...registerCreate('description')}
                placeholder="Кратко опишите, какие данные и как будут обрабатываться"
                rows={5}
              />
            </label>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создаём...' : 'Создать новый пайплайн'}
            </Button>
          </form>
          {createErrors.name?.message && (
            <p className={styles.error}>{createErrors.name.message}</p>
          )}
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
          {updateErrorText && <p className={styles.error}>{updateErrorText}</p>}

          <ul className={styles.items}>
            {pipelinesQuery.data?.results.map((pipeline) => (
              <li className={styles.item} key={pipeline.id}>
                {editingPipelineId === pipeline.id ? (
                  <form
                    className={styles.itemEditForm}
                    onSubmit={handleEditSubmit((values) => {
                      void onSaveEdit(pipeline.id, values);
                    })}
                  >
                    <div className={`${styles.itemCard} ${styles.itemCardEditing}`}>
                      <div className={styles.meta}>
                        <label className={styles.editLabel}>
                          Название
                          <input
                            {...registerEdit('name', {
                              required: 'Введите название пайплайна',
                              validate: (value) =>
                                value.trim().length > 0 || 'Введите название пайплайна',
                              maxLength: {
                                value: 120,
                                message: 'Максимум 120 символов',
                              },
                            })}
                          />
                          {editErrors.name?.message ? (
                            <span className={styles.inputError}>{editErrors.name.message}</span>
                          ) : null}
                        </label>
                        <label className={styles.editLabel}>
                          Описание
                          <textarea {...registerEdit('description')} rows={3} />
                        </label>
                        <div className={styles.badges}>
                          <span>Нод: {pipeline.node_count}</span>
                          <span>Последний запуск: {pipeline.last_run_status ?? '—'}</span>
                          <span>Обновлен: {formatUpdatedAt(pipeline.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.buttons}>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
                      </Button>
                      <Button
                        type="button"
                        color="white"
                        disabled={updateMutation.isPending}
                        onClick={onCancelEdit}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
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
                    <div className={styles.buttons}>
                      <button
                        className={styles.editButton}
                        type="button"
                        disabled={deleteMutation.isPending || updateMutation.isPending}
                        onClick={() => {
                          onStartEdit(pipeline);
                        }}
                        aria-label={`Редактировать пайплайн ${pipeline.name}`}
                        title={`Редактировать пайплайн ${pipeline.name}`}
                      >
                        <img alt="Редактировать" src={editIcon} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        disabled={deleteMutation.isPending || updateMutation.isPending}
                        onClick={() => {
                          void onDelete(pipeline.id);
                        }}
                        aria-label={`Удалить пайплайн ${pipeline.name}`}
                        title={`Удалить пайплайн ${pipeline.name}`}
                      >
                        <img alt="Удалить" src={trashIcon} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
