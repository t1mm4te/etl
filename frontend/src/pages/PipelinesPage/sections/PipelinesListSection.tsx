import { useQuery } from '@tanstack/react-query';
import styles from '../index.module.scss';
import { listPipelines } from '../../../shared/api/pipelines.ts';
import { pipelinesListKey } from '../../../shared/api/queryKeys.ts';
import { extractError } from '../../../shared/lib/extractError';
import { PipelineListItem } from './PipelineListItem.tsx';

export function PipelinesListSection() {
  const pipelinesQuery = useQuery({ queryKey: pipelinesListKey, queryFn: listPipelines });

  return (
    <section className={styles.list}>
      {pipelinesQuery.isLoading && <p className={styles.muted}>Загрузка...</p>}
      {pipelinesQuery.isError && (
        <p className={styles.error}>{extractError(pipelinesQuery.error, 'Ошибка загрузки')}</p>
      )}

      {!pipelinesQuery.isLoading && pipelinesQuery.data?.results.length === 0 ? (
        <p className={styles.muted}>У вас пока нет пайплайнов. Создайте первый!</p>
      ) : null}

      <ul className={styles.items}>
        {pipelinesQuery.data?.results.map((pipeline) => (
          <PipelineListItem key={pipeline.id} pipeline={pipeline} />
        ))}
      </ul>
    </section>
  );
}
