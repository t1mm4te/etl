import type { PipelineRunDetail } from '../../../../shared/api/types';
import styles from './index.module.scss';

type RunResultsCardProps = {
  run: PipelineRunDetail | null;
};

const STATUS_LABELS: Record<PipelineRunDetail['status'], string> = {
  pending: 'Ожидает',
  running: 'Выполняется',
  success: 'Успешно',
  failed: 'Ошибка',
  cancelled: 'Отменён',
};

const RUN_MODE_LABELS: Record<PipelineRunDetail['run_mode'], string> = {
  full: 'Полный запуск',
  preview: 'Превью',
};

const NODE_STATUS_LABELS: Record<PipelineRunDetail['node_runs'][number]['status'], string> = {
  pending: 'Ожидает',
  running: 'Выполняется',
  success: 'Успешно',
  failed: 'Ошибка',
  skipped: 'Пропущена',
};

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export function RunResultsCard({ run }: RunResultsCardProps) {
  if (!run) {
    return null;
  }

  const nodeRuns = run.node_runs;

  return (
    <section className={styles.runsCard} aria-label="Результаты запуска пайплайна">
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Последний запуск</p>
          <h2 className={styles.title}>{STATUS_LABELS[run.status]}</h2>
        </div>
        <div className={styles.summary}>
          <span>{RUN_MODE_LABELS[run.run_mode]}</span>
          <span>Нод: {nodeRuns.length}</span>
        </div>
      </div>

      <dl className={styles.meta}>
        <div>
          <dt>Начало</dt>
          <dd>{formatTimestamp(run.started_at ?? run.created_at)}</dd>
        </div>
        <div>
          <dt>Завершение</dt>
          <dd>{formatTimestamp(run.finished_at)}</dd>
        </div>
        <div>
          <dt>Результат</dt>
          <dd>{STATUS_LABELS[run.status]}</dd>
        </div>
      </dl>

      {run.error_message ? <p className={styles.error}>{run.error_message}</p> : null}

      <div className={styles.nodesBlock}>
        <h3>Ноды</h3>
        {nodeRuns.length === 0 ? (
          <p className={styles.emptyState}>Для этого запуска нет данных по нодам.</p>
        ) : (
          <ul className={styles.nodeList}>
            {nodeRuns.map((nodeRun) => (
              <li key={nodeRun.id} className={styles.nodeItem}>
                <div className={styles.nodeHeading}>
                  <strong>{nodeRun.node_label || nodeRun.node_operation}</strong>
                  <span className={styles.nodeStatus}>{NODE_STATUS_LABELS[nodeRun.status]}</span>
                </div>
                <div className={styles.nodeMeta}>
                  <span>Старт: {formatTimestamp(nodeRun.started_at)}</span>
                  <span>Финиш: {formatTimestamp(nodeRun.finished_at)}</span>
                  <span>Строк: {nodeRun.output_row_count ?? '—'}</span>
                </div>
                {nodeRun.error_message ? (
                  <p className={styles.nodeError}>{nodeRun.error_message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
