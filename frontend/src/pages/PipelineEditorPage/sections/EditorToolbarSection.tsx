import { useNavigate } from 'react-router-dom';
import { EditorToolbar } from '../../../components/PipelineEditor/EditorToolbar';
import { usePipelineEditorMutations } from '../hooks/usePipelineEditorMutations';
import { usePipelineEditorQueries } from '../hooks/usePipelineEditorQueries';

type EditorToolbarSectionProps = {
  pipelineId: string;
};

export function EditorToolbarSection({ pipelineId }: EditorToolbarSectionProps) {
  const navigate = useNavigate();
  const { pipelineQuery, runQuery } = usePipelineEditorQueries(pipelineId);
  const { runPipelineMutation } = usePipelineEditorMutations({ pipelineId });

  return (
    <EditorToolbar
      isPipelineLoaded={Boolean(pipelineQuery.data)}
      isRunPending={runPipelineMutation.isPending}
      onBack={() => navigate('/pipelines')}
      onRun={() => {
        void runPipelineMutation.mutateAsync();
      }}
      pipelineName={pipelineQuery.data?.name}
      runStatus={runQuery.data?.status}
    />
  );
}
