import { RunResultsCard } from '../../../features/pipelineEditor/components/RunResultsCard';
import { usePipelineEditorQueries } from '../../../features/pipelineEditor/hooks/usePipelineEditorQueries';

type RunResultsSectionProps = {
  pipelineId: string;
};

export function RunResultsSection({ pipelineId }: RunResultsSectionProps) {
  const { runQuery } = usePipelineEditorQueries(pipelineId);

  return <RunResultsCard nodeRuns={runQuery.data?.node_runs ?? []} />;
}
