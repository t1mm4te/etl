import { Button } from '../../Button';
import styles from './index.module.scss';

type EditorToolbarProps = {
  pipelineName?: string;
  runStatus?: string;
  isRunPending: boolean;
  isPipelineLoaded: boolean;
  onBack: () => void;
  onRun: () => void;
};

export function EditorToolbar({
  pipelineName,
  runStatus,
  isRunPending,
  isPipelineLoaded,
  onBack,
  onRun,
}: EditorToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.main}>
        <div className={styles.leftTools}>
          <Button type="button" color="white" onClick={onBack}>
            ← Мои пайплайны
          </Button>
          <h1 className={styles.pipelineTitle}>{pipelineName ?? 'Редактор пайплайна'}</h1>
        </div>

        <div className={styles.runBox}>
          <Button type="button" disabled={isRunPending || !isPipelineLoaded} onClick={onRun}>
            {isRunPending ? 'Запускаем...' : 'Запустить пайплайн'}
          </Button>
        </div>
      </div>
      {runStatus ? <div className={styles.runStatus}>Статус запуска: {runStatus}</div> : null}
    </header>
  );
}
