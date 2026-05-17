import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePipelineEditorStore } from '../../store/pipelineEditorStore';
import { EditorToolbarSection } from './sections/EditorToolbarSection';
import { PipelineWorkspaceSection } from './sections/PipelineWorkspaceSection';
import { RunResultsSection } from './sections/RunResultsSection';
import styles from './index.module.scss';

export function PipelineEditorPage() {
  const { pipelineId = '' } = useParams();
  const resetEditorState = usePipelineEditorStore((state) => state.resetEditorState);

  useEffect(() => {
    resetEditorState();
  }, [pipelineId, resetEditorState]);

  return (
    <main className={styles.page}>
      <EditorToolbarSection pipelineId={pipelineId} />
      <PipelineWorkspaceSection pipelineId={pipelineId} />
      <RunResultsSection pipelineId={pipelineId} />
    </main>
  );
}
