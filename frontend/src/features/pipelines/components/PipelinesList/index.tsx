import { useQuery } from '@tanstack/react-query';
import { listPipelines } from '../../../../shared/api/pipelines.ts';
import { pipelinesListKey } from '../../../../shared/api/queryKeys.ts';
import { extractError } from '../../../../shared/lib/extractError.ts';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import { PipelineCard } from '../PipelineCard/index.tsx';
import styles from './index.module.scss';

export function PipelinesList() {
  const pipelinesQuery = useQuery({ queryKey: pipelinesListKey, queryFn: listPipelines });

  return (
    <section className={styles.root}>
      {pipelinesQuery.isLoading ? (
        <LoadingState className={styles.loadingState} spinnerSize={28} />
      ) : null}
      {pipelinesQuery.isError && (
        <p className={styles.error}>{extractError(pipelinesQuery.error, 'Ошибка загрузки')}</p>
      )}

      {!pipelinesQuery.isLoading && pipelinesQuery.data?.results.length === 0 ? (
        <p className={styles.muted}>У вас пока нет пайплайнов. Создайте первый!</p>
      ) : null}

      {pipelinesQuery.data ? (
        <ul className={styles.items}>
          {pipelinesQuery.data.results.map((pipeline) => (
            <PipelineCard key={pipeline.id} pipeline={pipeline} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
