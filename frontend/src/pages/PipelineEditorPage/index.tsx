import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  type Connection,
  Controls,
  MarkerType,
  MiniMap,
  type ReactFlowInstance,
  type Node as FlowNode,
  type Edge as FlowEdge,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import { useNavigate, useParams } from 'react-router-dom';
import 'reactflow/dist/style.css';
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  patchNode,
  runPipeline,
} from '../../api/pipelines';
import type { Node as ApiNode, NodeUpdatePayload, OperationItem } from '../../api/types';
import {
  PipelineOperationNode,
  type PipelineOperationNodeData,
} from '../../components/PipelineOperationNode';
import { EditorToolbar } from '../../components/PipelineEditor/EditorToolbar';
import { NodeConfigModal } from '../../components/PipelineEditor/NodeConfigModal';
import { OperationsSidebar } from '../../components/PipelineEditor/OperationsSidebar';
import { RunResultsCard } from '../../components/PipelineEditor/RunResultsCard';
import { extractError } from '../../lib/extractError';
import { pipelineQueryKey, usePipelineEditorQueries } from './hooks/usePipelineEditorQueries';
import { useNodeConfigModalState } from './hooks/useNodeConfigModalState';
import styles from './index.module.scss';

const NODE_TYPES = {
  operation: PipelineOperationNode,
};

function toFlowNode(
  node: ApiNode,
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

export function PipelineEditorPage() {
  const { pipelineId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineOperationNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [canvasError, setCanvasError] = useState<string>();
  const [runId, setRunId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const { pipelineQuery, operationsQuery, runQuery, operationMetaByType, sortedCategories } =
    usePipelineEditorQueries(pipelineId, runId);

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

  const patchNodeMutation = useMutation({
    mutationFn: ({ nodeId, payload }: { nodeId: string; payload: NodeUpdatePayload }) =>
      patchNode(pipelineId, nodeId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });
    },
  });

  const createNodeMutation = useMutation({
    mutationFn: (operation: OperationItem) => {
      const position = getNewNodePosition();
      return createNode(pipelineId, {
        operation_type: operation.type,
        label: operation.label,
        config: {},
        position_x: position.x,
        position_y: position.y,
      });
    },
    onSuccess: async (createdNode) => {
      await queryClient.invalidateQueries({ queryKey: pipelineQueryKey(pipelineId) });

      if (flowInstance) {
        flowInstance.setCenter(createdNode.position_x, createdNode.position_y, {
          duration: 350,
          zoom: Math.max(flowInstance.getZoom(), 1),
        });
      }
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

  const runPipelineMutation = useMutation({
    mutationFn: () => runPipeline(pipelineId),
    onSuccess: (run) => {
      setRunId(run.id);
    },
  });

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryId]: !(current[categoryId] ?? sortedCategories[0]?.[0] === categoryId),
    }));
  };

  const {
    editingNode,
    configText,
    datasourceId,
    modalError,
    onFetchPreview,
    onSaveNodeConfig,
    onUploadFile,
    openNodeModal,
    closeModal,
    preview,
    previewInfo,
    selectedFile,
    setConfigText,
    setDatasourceId,
    setSelectedFile,
  } = useNodeConfigModalState({
    nodes: pipelineQuery.data?.nodes,
    saveNodeConfig: async (nodeId, config) => {
      await patchNodeMutation.mutateAsync({
        nodeId,
        payload: {
          config,
        },
      });
    },
  });

  useEffect(() => {
    if (!pipelineQuery.data) {
      return;
    }

    setNodes(
      pipelineQuery.data.nodes.map((node) =>
        toFlowNode(node, operationMetaByType.get(node.operation_type), onDeleteNode)
      )
    );
    setEdges(
      pipelineQuery.data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source_node,
        target: edge.target_node,
        sourceHandle: edge.source_port || null,
        targetHandle: edge.target_port || null,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
    );
  }, [onDeleteNode, operationMetaByType, pipelineQuery.data, setEdges, setNodes]);

  const onConnect = async (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    setCanvasError(undefined);
    try {
      const createdEdge = await createEdgeMutation.mutateAsync({ connection });
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

  const isSourceNode =
    editingNode?.operation_type === 'source_file' || editingNode?.operation_type === 'source_db';

  return (
    <main className={styles.page}>
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

      {canvasError ? <p className={styles.error}>{canvasError}</p> : null}

      <section className={styles.layout}>
        <OperationsSidebar
          isLoading={operationsQuery.isLoading}
          onCreateNode={(operation) => {
            void createNodeMutation.mutateAsync(operation);
          }}
          onToggleCategory={toggleCategory}
          openCategories={openCategories}
          operations={operationsQuery.data?.operations ?? []}
          sortedCategories={sortedCategories}
        />

        <div className={styles.canvas} ref={canvasRef}>
          {pipelineQuery.isLoading ? <p className={styles.muted}>Загружаем пайплайн...</p> : null}

          <ReactFlow
            edges={edges}
            nodes={nodes}
            nodeTypes={NODE_TYPES}
            onInit={setFlowInstance}
            onConnect={(connection: Connection) => {
              void onConnect(connection);
            }}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={(items: FlowEdge[]) => {
              void onDeleteEdges(items);
            }}
            onNodesDelete={(items: FlowNode<PipelineOperationNodeData>[]) => {
              void onDeleteNodes(items);
            }}
            onNodeDoubleClick={(
              _event: ReactMouseEvent,
              node: FlowNode<PipelineOperationNodeData>
            ) => openNodeModal(node.id)}
            onNodeDragStop={(
              _event: ReactMouseEvent,
              node: FlowNode<PipelineOperationNodeData>
            ) => {
              void patchNodeMutation.mutateAsync({
                nodeId: node.id,
                payload: {
                  position_x: node.position.x,
                  position_y: node.position.y,
                },
              });
            }}
            onNodesChange={onNodesChange}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </section>

      <RunResultsCard nodeRuns={runQuery.data?.node_runs ?? []} />

      {editingNode ? (
        <NodeConfigModal
          configText={configText}
          datasourceId={datasourceId}
          isSourceNode={Boolean(isSourceNode)}
          modalError={modalError}
          node={editingNode}
          onClose={closeModal}
          onConfigTextChange={setConfigText}
          onDatasourceIdChange={setDatasourceId}
          onFetchPreview={() => {
            void onFetchPreview();
          }}
          onFileChange={setSelectedFile}
          onSaveConfig={() => {
            void onSaveNodeConfig();
          }}
          onUploadFile={() => {
            void onUploadFile();
          }}
          preview={preview}
          previewInfo={previewInfo}
          selectedFile={selectedFile}
        />
      ) : null}
    </main>
  );
}
