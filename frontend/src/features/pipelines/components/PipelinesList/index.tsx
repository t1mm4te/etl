import { useQuery } from '@tanstack/react-query';
import { listPipelines } from '../../../../shared/api/pipelines.ts';
import { pipelinesListKey } from '../../../../shared/api/queryKeys.ts';
import { extractError } from '../../../../shared/lib/extractError.ts';
import { PipelineCard } from '../PipelineCard/index.tsx';
import styles from './index.module.scss';

export function PipelinesList() {
  const pipelinesQuery = useQuery({ queryKey: pipelinesListKey, queryFn: listPipelines });

  return (
    <section className={styles.root}>
      {pipelinesQuery.isLoading && <p className={styles.muted}>Загрузка...</p>}
      {pipelinesQuery.isError && (
        <p className={styles.error}>{extractError(pipelinesQuery.error, 'Ошибка загрузки')}</p>
      )}

      {!pipelinesQuery.isLoading && pipelinesQuery.data?.results.length === 0 ? (
        <p className={styles.muted}>У вас пока нет пайплайнов. Создайте первый!</p>
      ) : null}

      <ul className={styles.items}>
        {pipelinesQuery.data?.results.map((pipeline) => (
          <PipelineCard key={pipeline.id} pipeline={pipeline} />
        ))}
      </ul>
    </section>
  );
}
