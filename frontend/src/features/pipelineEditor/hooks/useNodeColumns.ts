import { useCallback, useMemo, useState } from 'react';
import { getNodeInputColumns } from '../../../shared/api/pipelines';
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

        const byPort: Record<string, string[]> = {};
        const allColumnNames: string[] = [];

        Object.entries(response.columns).forEach(([port, items]) => {
          const names = items
            .map((item) => item.name)
            .filter((name): name is string => typeof name === 'string' && name.length > 0);

          byPort[port] = Array.from(new Set(names));
          allColumnNames.push(...names);
        });

        setAvailableColumnsByPort(byPort);
        setAvailableColumns(Array.from(new Set(allColumnNames)));
      } catch {
        setAvailableColumnsByPort({});
        setAvailableColumns([]);
      }
    },
    [pipelineId]
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
