import { useCallback, useMemo, useState } from 'react';
import { getDatasourceDetail, getNodeInputColumns } from '../../../shared/api/pipelines';
import type { Edge, Node as ApiNode } from '../../../shared/api/types';

type UseNodeColumnsParams = {
  pipelineId: string;
  editingNode: ApiNode | null;
  nodes: ApiNode[] | undefined;
  edges: Edge[] | undefined;
};

export function useNodeColumns({ pipelineId, editingNode, nodes, edges }: UseNodeColumnsParams) {
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [availableColumnsByPort, setAvailableColumnsByPort] = useState<Record<string, string[]>>(
    {}
  );

  const hasIncomingData = useMemo(() => {
    if (!editingNode || !edges) {
      return false;
    }
    return edges.some((edge) => edge.target_node === editingNode.id);
  }, [editingNode, edges]);

  const inputNodeLabelsByPort = useMemo(() => {
    if (!editingNode || !edges || !nodes) {
      return {};
    }

    const incoming = edges.filter((edge) => edge.target_node === editingNode.id);
    const labels: Record<string, string> = {};

    incoming.forEach((edge, index) => {
      const sourceNode = nodes.find((node) => node.id === edge.source_node);
      const label = sourceNode?.label ?? `Вход ${index + 1}`;
      const port = edge.target_port || 'main';
      labels[port] = label;
    });

    if (!labels.left && labels.main) {
      labels.left = labels.main;
    }

    return labels;
  }, [editingNode, edges, nodes]);

  const loadAvailableColumns = useCallback(
    async (nodeId: string) => {
      try {
        const response = await getNodeInputColumns(pipelineId, nodeId);
        const incomingEdges = edges?.filter((edge) => edge.target_node === nodeId) ?? [];
        const sourceNodeColumnsByPort = new Map<string, string[]>();

        await Promise.all(
          incomingEdges.map(async (edge) => {
            const sourceNode = nodes?.find((node) => node.id === edge.source_node);
            const port = edge.target_port || 'main';

            if (
              !sourceNode ||
              (sourceNode.operation_type !== 'source_file' &&
                sourceNode.operation_type !== 'source_db')
            ) {
              return;
            }

            const datasourceId = sourceNode.config?.datasource_id;
            if (typeof datasourceId !== 'string' || !datasourceId) {
              return;
            }

            const datasource = await getDatasourceDetail(datasourceId);
            if (datasource.status !== 'ready') {
              return;
            }

            sourceNodeColumnsByPort.set(
              port,
              Array.from(
                new Set(
                  (datasource.columns_meta || [])
                    .map((item) => item.name)
                    .filter((name): name is string => typeof name === 'string' && name.length > 0)
                )
              )
            );
          })
        );

        const byPort = Object.entries(response.columns).reduce<Record<string, string[]>>(
          (acc, [port, items]) => {
            const names = items
              .map((item) => item.name)
              .filter((name): name is string => typeof name === 'string' && name.length > 0);
            acc[port] = Array.from(new Set(names));
            return acc;
          },
          {}
        );

        for (const [port, columns] of sourceNodeColumnsByPort.entries()) {
          byPort[port] = columns;
        }

        const names = Object.values(byPort)
          .flatMap((items) => items)
          .filter((name): name is string => typeof name === 'string' && name.length > 0);

        setAvailableColumnsByPort(byPort);
        setAvailableColumns(Array.from(new Set(names)));
      } catch {
        setAvailableColumnsByPort({});
        setAvailableColumns([]);
      }
    },
    [edges, nodes, pipelineId]
  );

  const resetAvailableColumns = useCallback(() => {
    setAvailableColumns([]);
    setAvailableColumnsByPort({});
  }, []);

  return {
    availableColumns,
    availableColumnsByPort,
    hasIncomingData,
    inputNodeLabelsByPort,
    loadAvailableColumns,
    resetAvailableColumns,
  };
}
