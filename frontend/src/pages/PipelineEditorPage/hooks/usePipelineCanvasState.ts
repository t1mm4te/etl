import { useQueryClient } from '@tanstack/react-query';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addEdge,
  MarkerType,
  type Connection,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import { deleteEdge, deleteNode } from '../../../api/pipelines';
import type { Edge, Node, OperationItem, PipelineDetail } from '../../../api/types';
import { type PipelineOperationNodeData } from '../../../components/PipelineOperationNode';
import { extractError } from '../../../lib/extractError';
import { pipelineQueryKey } from './usePipelineEditorQueries';

type SortedCategories = Array<[string, { order: number }]>;

type UsePipelineCanvasStateParams = {
  pipelineId: string;
  pipeline: PipelineDetail | undefined;
  operationMetaByType: Map<string, OperationItem>;
  sortedCategories: SortedCategories;
  createEdgeAsync: (connection: Connection) => Promise<Edge>;
  patchNodePosition: (nodeId: string, position: { x: number; y: number }) => Promise<void>;
};

function toFlowNode(
  node: Node,
  operation: OperationItem | undefined,
  onDeleteNode: (nodeId: string) => void
): FlowNode<PipelineOperationNodeData> {
  return {
    id: node.id,
    type: 'operation',
    position: {
      x: node.position_x,
      y: node.position_y,
    },
    data: {
      label: node.label,
      operationType: node.operation_type,
      category: operation?.category,
      inputPorts: operation?.input_ports ?? [],
      onDelete: onDeleteNode,
    },
  };
}

export function usePipelineCanvasState({
  pipelineId,
  pipeline,
  operationMetaByType,
  sortedCategories,
  createEdgeAsync,
  patchNodePosition,
}: UsePipelineCanvasStateParams) {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineOperationNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [canvasError, setCanvasError] = useState<string>();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const getNewNodePosition = useCallback(() => {
    if (!flowInstance || !canvasRef.current) {
      return { x: 120, y: 120 };
    }

    const bounds = canvasRef.current.getBoundingClientRect();
    return flowInstance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
  }, [flowInstance]);

  const onDeleteNode = useCallback(
    async (nodeId: string) => {
      setCanvasError(undefined);
      try {
        await deleteNode(pipelineId, nodeId);
        await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });
      } catch (error) {
        setCanvasError(extractError(error, 'Не удалось удалить ноду'));
      }
    },
    [pipelineId, queryClient]
  );

  useEffect(() => {
    if (!pipeline) {
      return;
    }

    setNodes(
      pipeline.nodes.map((node) =>
        toFlowNode(node, operationMetaByType.get(node.operation_type), onDeleteNode)
      )
    );
    setEdges(
      pipeline.edges.map((edge) => ({
        id: edge.id,
        source: edge.source_node,
        target: edge.target_node,
        sourceHandle: edge.source_port || null,
        targetHandle: edge.target_port || null,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
    );
  }, [onDeleteNode, operationMetaByType, pipeline, setEdges, setNodes]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryId]: !(current[categoryId] ?? sortedCategories[0]?.[0] === categoryId),
    }));
  };

  const onConnect = async (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    setCanvasError(undefined);
    try {
      const createdEdge = await createEdgeAsync(connection);
      setEdges((currentEdges: FlowEdge[]) =>
        addEdge(
          {
            ...connection,
            id: createdEdge.id,
            sourceHandle: createdEdge.source_port || null,
            targetHandle: createdEdge.target_port || null,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges
        )
      );
    } catch (error) {
      setCanvasError(extractError(error, 'Не удалось соединить ноды'));
    }
  };

  const onDeleteEdges = async (edgesToDelete: FlowEdge[]) => {
    if (!pipelineId || edgesToDelete.length === 0) {
      return;
    }

    await Promise.all(
      edgesToDelete.map(async (edge) => {
        if (edge.id) {
          await deleteEdge(pipelineId, edge.id);
        }
      })
    );

    await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });
  };

  const onDeleteNodes = async (nodesToDelete: FlowNode<PipelineOperationNodeData>[]) => {
    if (!pipelineId || nodesToDelete.length === 0) {
      return;
    }

    await Promise.all(nodesToDelete.map(async (node) => onDeleteNode(node.id)));
    await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });
  };

  const onNodeDragStop = async (
    _event: ReactMouseEvent,
    node: FlowNode<PipelineOperationNodeData>
  ) => {
    await patchNodePosition(node.id, node.position);
  };

  return {
    canvasError,
    canvasRef,
    edges,
    flowInstance,
    getNewNodePosition,
    nodes,
    onConnect,
    onDeleteEdges,
    onDeleteNodes,
    onEdgesChange,
    onNodeDragStop,
    onNodesChange,
    openCategories,
    setFlowInstance,
    toggleCategory,
  };
}
