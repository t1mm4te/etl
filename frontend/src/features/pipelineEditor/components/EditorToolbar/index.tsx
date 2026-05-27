import { useState } from 'react';
import { Button } from '../../../../shared/ui/Button';
import styles from './index.module.scss';
import { useNavigate } from 'react-router-dom';
import { usePipelineEditorQueries } from '../../hooks/usePipelineEditorQueries';
import { usePipelineEditorMutations } from '../../hooks/usePipelineEditorMutations';
import { RunResultsModal } from '../RunResultsModal';

type EditorToolbarProps = {
  pipelineId: string;
};

export function EditorToolbar({ pipelineId }: EditorToolbarProps) {
  const navigate = useNavigate();
  const { pipelineQuery, runQuery } = usePipelineEditorQueries(pipelineId);
  const { runPipelineMutation } = usePipelineEditorMutations({ pipelineId });
  const [isRunResultsOpen, setIsRunResultsOpen] = useState(false);
  const [manualRunId, setManualRunId] = useState<string | null>(null);

  const isPipelineLoaded = Boolean(pipelineQuery.data);
  const isRunPending = runPipelineMutation.isPending;
  const pipelineName = pipelineQuery.data?.name;
  const run = runQuery.data ?? null;
  const isActiveRun = Boolean(manualRunId && run?.id === manualRunId);
  const isRunLoading =
    isRunResultsOpen && (!isActiveRun || run?.status === 'pending' || run?.status === 'running');

  const onBack = () => navigate('/pipelines');
  const onRun = async () => {
    try {
      const startedRun = await runPipelineMutation.mutateAsync();
      setManualRunId(startedRun.id);
      setIsRunResultsOpen(true);
    } catch {
      setIsRunResultsOpen(false);
      setManualRunId(null);
    }
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
      <RunResultsModal
        isOpen={isRunResultsOpen}
        run={isActiveRun ? run : null}
        isLoading={isRunLoading}
        onClose={() => {
          setIsRunResultsOpen(false);
          setManualRunId(null);
        }}
      />
    </header>
  );
}
