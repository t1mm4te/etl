import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { createPipeline, listPipelines } from '../../api/pipelines';
import { extractError } from '../../lib/extractError';
import styles from './index.module.scss';

const PIPELINES_QUERY_KEY = ['pipelines'];

export function PipelinesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('Новый пайплайн');
  const [description, setDescription] = useState('');
  const [errorText, setErrorText] = useState<string>();

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

  const onCreate = async () => {
    setErrorText(undefined);

    if (!name.trim()) {
      setErrorText('Введите название пайплайна');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
    } catch (error) {
      setErrorText(extractError(error, 'Не удалось создать пайплайн'));
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Мои пайплайны</h1>
          <p>Создавайте и редактируйте ETL-процессы в визуальном редакторе.</p>
        </div>
      </header>

      <section className={styles.createCard}>
        <h2>Новый пайплайн</h2>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            Название
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className={styles.label}>
            Описание
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Опционально"
            />
          </label>

          <div className={styles.actions}>
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => {
                void onCreate();
              }}
            >
              {createMutation.isPending ? 'Создаём...' : 'Создать новый пайплайн'}
            </Button>
          </div>
        </div>
        {errorText ? <p className={styles.error}>{errorText}</p> : null}
      </section>

      <section className={styles.list}>
        <h2>Список</h2>

        {pipelinesQuery.isLoading ? <p className={styles.muted}>Загрузка...</p> : null}
        {pipelinesQuery.isError ? (
          <p className={styles.error}>{extractError(pipelinesQuery.error, 'Ошибка загрузки')}</p>
        ) : null}

        {!pipelinesQuery.isLoading && pipelinesQuery.data?.results.length === 0 ? (
          <p className={styles.muted}>Пока нет пайплайнов.</p>
        ) : null}

        <ul className={styles.items}>
          {pipelinesQuery.data?.results.map((pipeline) => (
            <li className={styles.item} key={pipeline.id}>
              <div className={styles.meta}>
                <h3>{pipeline.name}</h3>
                <p>{pipeline.description || 'Без описания'}</p>
                <div className={styles.badges}>
                  <span>Нод: {pipeline.node_count}</span>
                  <span>Последний запуск: {pipeline.last_run_status ?? '—'}</span>
                </div>
              </div>

              <Button
                type="button"
                color="white"
                onClick={() => navigate(`/pipelines/${pipeline.id}/editor`)}
              >
                Открыть редактор
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
