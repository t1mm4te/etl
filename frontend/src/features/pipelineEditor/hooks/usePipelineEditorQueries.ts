import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getOperationsCatalog,
  getPipelineDetail,
  getPipelineRun,
} from '../../../shared/api/pipelines';
import type { OperationItem } from '../../../shared/api/types';
import { usePipelineEditorStore } from '../store/pipelineEditorStore';
import {
  pipelineDetailKey,
  operationsCatalogKey,
  pipelineRunKey,
} from '../../../shared/api/queryKeys';

export function usePipelineEditorQueries(pipelineId: string) {
  const runId = usePipelineEditorStore((state) => state.runId);

  const pipelineQuery = useQuery({
    queryKey: pipelineDetailKey(pipelineId),
    queryFn: () => getPipelineDetail(pipelineId),
    enabled: Boolean(pipelineId),
  });

  const operationsQuery = useQuery({
    queryKey: operationsCatalogKey,
    queryFn: getOperationsCatalog,
    // catalog rarely changes — keep it fresh in cache and avoid refetches
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const runQuery = useQuery({
    queryKey: pipelineRunKey(runId),
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
