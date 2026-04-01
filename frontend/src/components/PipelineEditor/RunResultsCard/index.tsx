import type { NodeRun } from '../../../api/types';
import styles from './index.module.scss';

type RunResultsCardProps = {
  nodeRuns: NodeRun[];
};

export function RunResultsCard({ nodeRuns }: RunResultsCardProps) {
  if (nodeRuns.length === 0) {
    return null;
  }

  return (
    <section className={styles.runsCard}>
      <h2>Последний запуск</h2>
      <ul>
        {nodeRuns.map((nodeRun) => (
          <li key={nodeRun.id}>
            <strong>{nodeRun.node_label || nodeRun.node_operation}</strong> — {nodeRun.status}
            {nodeRun.error_message ? ` (${nodeRun.error_message})` : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}
