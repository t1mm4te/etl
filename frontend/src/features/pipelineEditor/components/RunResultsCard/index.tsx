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

const NODE_STATUS_LABELS: Record<PipelineRunDetail['node_runs'][number]['status'], string> = {
  pending: 'Ожидает',
  running: 'Выполняется',
  success: 'Успешно',
  failed: 'Ошибка',
  skipped: 'Пропущен',
};

const STATUS_CLASS_NAMES: Record<PipelineRunDetail['status'], string> = {
  pending: styles.statusPending,
  running: styles.statusRunning,
  success: styles.statusSuccess,
  failed: styles.statusFailed,
  cancelled: styles.statusCancelled,
};

const NODE_STATUS_CLASS_NAMES: Record<PipelineRunDetail['node_runs'][number]['status'], string> = {
  pending: styles.statusPending,
  running: styles.statusRunning,
  success: styles.statusSuccess,
  failed: styles.statusFailed,
  skipped: styles.statusCancelled,
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
  const runSummaryText =
    run.status === 'success'
      ? 'Запуск завершён'
      : run.status === 'failed'
        ? 'Запуск завершён с ошибкой'
        : run.status === 'cancelled'
          ? 'Запуск отменён'
          : 'Запуск выполняется';

  return (
    <section className={styles.runsCard} aria-label="Результаты запуска пайплайна">
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{runSummaryText}</p>
          <h2 className={`${styles.title} ${STATUS_CLASS_NAMES[run.status]}`}>
            {STATUS_LABELS[run.status]}
          </h2>
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
          <dt>Всего узлов в пайплайне:</dt>
          <dd>{nodeRuns.length}</dd>
        </div>
      </dl>

      {run.error_message ? <p className={styles.error}>{run.error_message}</p> : null}

      <div className={styles.nodesBlock}>
        <h3>Узлы пайплана</h3>

        {nodeRuns.length === 0 ? (
          <p className={styles.emptyState}>Для этого запуска нет данных по нодам.</p>
        ) : (
          <ul className={styles.nodeList}>
            {nodeRuns.map((nodeRun) => (
              <li key={nodeRun.id} className={styles.nodeItem}>
                <div className={styles.nodeHeading}>
                  <strong>{nodeRun.node_label || nodeRun.node_operation}</strong>
                  <span
                    className={`${styles.nodeStatus} ${NODE_STATUS_CLASS_NAMES[nodeRun.status]}`}
                  >
                    {NODE_STATUS_LABELS[nodeRun.status]}
                  </span>
                </div>
                <div className={styles.nodeMeta}>
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
