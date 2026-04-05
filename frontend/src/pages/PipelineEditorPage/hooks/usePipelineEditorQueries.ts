import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOperationsCatalog, getPipelineDetail, getPipelineRun } from '../../../api/pipelines';
import type { OperationItem } from '../../../api/types';

export const pipelineQueryKey = (pipelineId: string) => ['pipeline-detail', pipelineId] as const;
// export const operationsQueryKey = ['operations-catalog'] as const;

export function usePipelineEditorQueries(pipelineId: string, runId: string | null) {
  const pipelineQuery = useQuery({
    queryKey: pipelineQueryKey(pipelineId),
    queryFn: () => getPipelineDetail(pipelineId),
    enabled: Boolean(pipelineId),
  });

  const operationsQuery = useQuery({
    queryKey: ['operations-catalog'],
    queryFn: getOperationsCatalog,
  });

  const runQuery = useQuery({
    queryKey: ['pipeline-run', runId],
    queryFn: () => getPipelineRun(runId ?? ''),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'running') {
        return 2000;
      }
      return false;
    },
  });

  const operationMetaByType = useMemo(() => {
    const byType = new Map<string, OperationItem>();
    operationsQuery.data?.operations.forEach((operation) => {
      byType.set(operation.type, operation);
    });
    return byType;
  }, [operationsQuery.data?.operations]);

  const sortedCategories = useMemo(() => {
    const categories = operationsQuery.data?.categories;
    if (!categories) {
      return [];
    }
    return Object.entries(categories).sort((first, second) => first[1].order - second[1].order);
  }, [operationsQuery.data?.categories]);

  return {
    pipelineQuery,
    operationsQuery,
    runQuery,
    operationMetaByType,
    sortedCategories,
  };
}
