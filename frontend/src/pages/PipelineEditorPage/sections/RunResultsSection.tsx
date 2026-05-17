import { RunResultsCard } from '../../../components/PipelineEditor/RunResultsCard';
import { usePipelineEditorQueries } from '../hooks/usePipelineEditorQueries';

type RunResultsSectionProps = {
  pipelineId: string;
};

export function RunResultsSection({ pipelineId }: RunResultsSectionProps) {
  const { runQuery } = usePipelineEditorQueries(pipelineId);

  return <RunResultsCard nodeRuns={runQuery.data?.node_runs ?? []} />;
}
