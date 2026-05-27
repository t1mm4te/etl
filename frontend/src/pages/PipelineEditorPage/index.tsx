import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePipelineEditorStore } from '../../features/pipelineEditor/store/pipelineEditorStore';
import { EditorToolbar } from '../../features/pipelineEditor/components/EditorToolbar';
import { PipelineWorkspaceSection } from './sections/PipelineWorkspaceSection';
import styles from './index.module.scss';

export function PipelineEditorPage() {
  const { pipelineId = '' } = useParams();
  const resetEditorState = usePipelineEditorStore((state) => state.resetEditorState);

  useEffect(() => {
    resetEditorState();
  }, [pipelineId, resetEditorState]);

  return (
    <main className={styles.page}>
      <EditorToolbar pipelineId={pipelineId} />
      <PipelineWorkspaceSection pipelineId={pipelineId} />
    </main>
  );
}
