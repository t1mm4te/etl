import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import editIcon from '../../../assets/node-icons/edit.svg';
import trashIcon from '../../../assets/node-icons/trash.svg';
import type { PipelineListItem as PipelineType } from '../../../shared/api/types';
import { extractError } from '../../../lib/extractError';
import styles from '../index.module.scss';
import type { EditPipelineValues } from '../hooks/types';
import { useDeletePipelineMutation } from '../hooks/useDeletePipelineMutation';
import { useUpdatePipelineMutation } from '../hooks/useUpdatePipelineMutation';

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatUpdatedAt = (updatedAt: string) => UPDATED_AT_FORMATTER.format(new Date(updatedAt));

type Props = {
  pipeline: PipelineType;
};

export function PipelineListItem({ pipeline }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteErrorText, setDeleteErrorText] = useState<string>();
  const [updateErrorText, setUpdateErrorText] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditPipelineValues>({
    defaultValues: {
      name: pipeline.name,
      description: pipeline.description ?? '',
    },
  });

  const deleteMutation = useDeletePipelineMutation();
  const updateMutation = useUpdatePipelineMutation();

  const onStartEdit = () => {
    setDeleteErrorText(undefined);
    setUpdateErrorText(undefined);
    setIsEditing(true);
    reset({
      name: pipeline.name,
      description: pipeline.description ?? '',
    });
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    setUpdateErrorText(undefined);
    reset({
      name: pipeline.name,
      description: pipeline.description ?? '',
    });
  };

  const onDelete = async () => {
    setDeleteErrorText(undefined);
    try {
      await deleteMutation.mutateAsync(pipeline.id);
    } catch (error) {
      setDeleteErrorText(extractError(error, 'Не удалось удалить пайплайн'));
    }
  };

  const onSaveEdit = async (values: EditPipelineValues) => {
    setUpdateErrorText(undefined);
    try {
      await updateMutation.mutateAsync({
        pipelineId: pipeline.id,
        name: values.name.trim(),
        description: values.description.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      setUpdateErrorText(extractError(error, 'Не удалось обновить пайплайн'));
    }
  };

  return (
    <li className={styles.item}>
      {isEditing ? (
        <form
          className={styles.itemEditForm}
          onSubmit={handleSubmit((values) => void onSaveEdit(values))}
        >
          <div className={`${styles.itemCard} ${styles.itemCardEditing}`}>
            <div className={styles.meta}>
              <label className={styles.editLabel}>
                Название
                <input
                  {...register('name', {
                    required: 'Введите название пайплайна',
                    validate: (value) => value.trim().length > 0 || 'Введите название пайплайна',
                    maxLength: { value: 120, message: 'Максимум 120 символов' },
                  })}
                />
                {errors.name?.message ? (
                  <span className={styles.inputError}>{errors.name.message}</span>
                ) : null}
              </label>
              <label className={styles.editLabel}>
                Описание
                <textarea {...register('description')} rows={3} />
              </label>
              <div className={styles.badges}>
                <span>Нод: {pipeline.node_count}</span>
                <span>Последний запуск: {pipeline.last_run_status ?? '—'}</span>
                <span>Обновлен: {formatUpdatedAt(pipeline.updated_at)}</span>
              </div>
            </div>
          </div>
          <div className={styles.buttons}>
            <button type="submit" disabled={updateMutation.isPending} className={styles.saveButton}>
              {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={updateMutation.isPending}
              onClick={onCancelEdit}
            >
              Отмена
            </button>
          </div>
          {updateErrorText && <p className={styles.error}>{updateErrorText}</p>}
        </form>
      ) : (
        <>
          <Link className={styles.itemCard} to={`/pipelines/${pipeline.id}/editor`}>
            <div className={styles.meta}>
              <h3 className={styles.pipelineTitle}>{pipeline.name}</h3>
              <p className={styles.pipelineDescription}>{pipeline.description || 'Без описания'}</p>
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
              onClick={onStartEdit}
              aria-label={`Редактировать пайплайн ${pipeline.name}`}
              title={`Редактировать пайплайн ${pipeline.name}`}
            >
              <img alt="Редактировать" src={editIcon} />
            </button>
            <button
              className={styles.deleteButton}
              type="button"
              disabled={deleteMutation.isPending || updateMutation.isPending}
              onClick={() => void onDelete()}
              aria-label={`Удалить пайплайн ${pipeline.name}`}
              title={`Удалить пайплайн ${pipeline.name}`}
            >
              <img alt="Удалить" src={trashIcon} />
            </button>
          </div>
          {deleteErrorText && <p className={styles.error}>{deleteErrorText}</p>}
        </>
      )}
    </li>
  );
}
