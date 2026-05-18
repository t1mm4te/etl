import { Button } from '../../../shared/ui/Button';
import styles from './index.module.scss';
import { useNavigate } from 'react-router-dom';
import { usePipelineEditorQueries } from '../../../pages/PipelineEditorPage/hooks/usePipelineEditorQueries';
import { usePipelineEditorMutations } from '../../../pages/PipelineEditorPage/hooks/usePipelineEditorMutations';

type EditorToolbarProps = {
  pipelineId: string;
};

export function EditorToolbar({ pipelineId }: EditorToolbarProps) {
  const navigate = useNavigate();
  const { pipelineQuery, runQuery } = usePipelineEditorQueries(pipelineId);
  const { runPipelineMutation } = usePipelineEditorMutations({ pipelineId });

  const isPipelineLoaded = Boolean(pipelineQuery.data);
  const isRunPending = runPipelineMutation.isPending;
  const pipelineName = pipelineQuery.data?.name;
  const runStatus = runQuery.data?.status;

  const onBack = () => navigate('/pipelines');
  const onRun = () => {
    void runPipelineMutation.mutateAsync();
  };

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
