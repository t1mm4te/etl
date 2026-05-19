import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Connection } from 'reactflow';
import { createEdge, createNode, patchNode, runPipeline } from '../../../shared/api/pipelines';
import type {
  Node,
  NodeConfig,
  NodeUpdatePayload,
  OperationItem,
  PipelineDetail,
} from '../../../shared/api/types';
import { usePipelineEditorStore } from '../store/pipelineEditorStore';
import { pipelineDetailKey } from '../../../shared/api/queryKeys';

type UsePipelineEditorMutationsParams = {
  pipelineId: string;
};

type CreateNodeInput = {
  operation: OperationItem;
  position: { x: number; y: number };
};

export function usePipelineEditorMutations({ pipelineId }: UsePipelineEditorMutationsParams) {
  const queryClient = useQueryClient();
  const setRunId = usePipelineEditorStore((state) => state.setRunId);

  const patchNodeMutation = useMutation({
    mutationFn: ({ nodeId, payload }: { nodeId: string; payload: NodeUpdatePayload }) =>
      patchNode(pipelineId, nodeId, payload),
    onSuccess: (updatedNode) => {
      // update cached pipeline detail replacing the patched node
      queryClient.setQueryData<PipelineDetail>(pipelineDetailKey(pipelineId), (old) => {
        if (!old) return old;
        const nextNodes = old.nodes.map((node: Node) =>
          node.id === updatedNode.id ? updatedNode : node
        );

        return {
          ...old,
          nodes: nextNodes,
        };
      });
    },
  });

  const createNodeMutation = useMutation({
    mutationFn: ({ operation, position }: CreateNodeInput) =>
      createNode(pipelineId, {
        operation_type: operation.type,
        label: operation.label,
        config: {},
        position_x: position.x,
        position_y: position.y,
      }),
    onSuccess: (createdNode) => {
      // append created node to cached pipeline detail
      queryClient.setQueryData<PipelineDetail>(pipelineDetailKey(pipelineId), (old) => {
        if (!old) return old;
        return {
          ...old,
          nodes: [...old.nodes, createdNode],
        };
      });
    },
  });

  const createEdgeMutation = useMutation({
    mutationFn: (payload: { connection: Connection }) =>
      createEdge(pipelineId, {
        source_node: payload.connection.source ?? '',
        target_node: payload.connection.target ?? '',
        source_port: payload.connection.sourceHandle ?? 'output',
        target_port: payload.connection.targetHandle ?? 'main',
      }),
    onSuccess: (createdEdge) => {
      // append created edge to cached pipeline detail
      queryClient.setQueryData<PipelineDetail>(pipelineDetailKey(pipelineId), (old) => {
        if (!old) return old;
        return {
          ...old,
          edges: [...old.edges, createdEdge],
        };
      });
    },
  });

  const runPipelineMutation = useMutation({
    mutationFn: () => runPipeline(pipelineId),
    onSuccess: (run) => {
      setRunId(run.id);
    },
  });

  const saveNodeConfig = async (
    nodeId: string,
    config: NodeConfig,
    options?: { label?: string }
  ) => {
    await patchNodeMutation.mutateAsync({
      nodeId,
      payload: {
        config,
        ...(options?.label ? { label: options.label } : {}),
      },
    });
  };

  const patchNodePosition = async (nodeId: string, position: { x: number; y: number }) => {
    await patchNodeMutation.mutateAsync({
      nodeId,
      payload: {
        position_x: position.x,
        position_y: position.y,
      },
    });
  };

  return {
    createNodeMutation,
    createEdgeMutation,
    patchNodeMutation,
    patchNodePosition,
    runPipelineMutation,
    saveNodeConfig,
  };
}
