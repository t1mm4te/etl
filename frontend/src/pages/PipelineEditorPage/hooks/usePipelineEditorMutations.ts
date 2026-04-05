import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Connection } from 'reactflow';
import { createEdge, createNode, patchNode, runPipeline } from '../../../api/pipelines';
import type { NodeConfig, NodeUpdatePayload, OperationItem } from '../../../api/types';
import { pipelineQueryKey } from './usePipelineEditorQueries';

type UsePipelineEditorMutationsParams = {
  pipelineId: string;
  onRunCreated: (runId: string) => void;
};

type CreateNodeInput = {
  operation: OperationItem;
  position: { x: number; y: number };
};

export function usePipelineEditorMutations({
  pipelineId,
  onRunCreated,
}: UsePipelineEditorMutationsParams) {
  const queryClient = useQueryClient();

  const patchNodeMutation = useMutation({
    mutationFn: ({ nodeId, payload }: { nodeId: string; payload: NodeUpdatePayload }) =>
      patchNode(pipelineId, nodeId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });
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
      onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });
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
  });

  const runPipelineMutation = useMutation({
    mutationFn: () => runPipeline(pipelineId),
    onSuccess: (run) => {
      onRunCreated(run.id);
    },
  });

  const saveNodeConfig = async (nodeId: string, config: NodeConfig) => {
    await patchNodeMutation.mutateAsync({
      nodeId,
      payload: {
        config,
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
