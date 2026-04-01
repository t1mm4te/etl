import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getDatasourceDetail,
  getOperationsCatalog,
  getPipelineDetail,
  getPipelineRun,
  patchNode,
  previewDatasource,
  runPipeline,
  uploadDatasource,
} from '../../api/pipelines';
import type {
  Node as ApiNode,
  NodeConfig,
  NodeUpdatePayload,
  OperationItem,
  PreviewResponse,
} from '../../api/types';
import {
  PipelineOperationNode,
  type PipelineOperationNodeData,
} from '../../components/PipelineOperationNode';
import { EditorToolbar } from '../../components/PipelineEditor/EditorToolbar';
import { NodeConfigModal } from '../../components/PipelineEditor/NodeConfigModal';
import { OperationsSidebar } from '../../components/PipelineEditor/OperationsSidebar';
import { RunResultsCard } from '../../components/PipelineEditor/RunResultsCard';
import { extractError } from '../../lib/extractError';
import styles from './index.module.scss';

const pipelineQueryKey = (pipelineId: string) => ['pipeline-detail', pipelineId] as const;
const operationsQueryKey = ['operations-catalog'] as const;
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

function parseConfigText(configText: string): NodeConfig {
  const parsed = JSON.parse(configText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Конфиг должен быть JSON-объектом');
  }
  return parsed as NodeConfig;
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

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [configText, setConfigText] = useState('{}');
  const [modalError, setModalError] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasourceId, setDatasourceId] = useState<string>('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewInfo, setPreviewInfo] = useState<string>();

  const pipelineQuery = useQuery({
    queryKey: pipelineQueryKey(pipelineId),
    queryFn: () => getPipelineDetail(pipelineId),
    enabled: Boolean(pipelineId),
  });

  const operationsQuery = useQuery({
    queryKey: operationsQueryKey,
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

  const editingNode = useMemo(
    () => pipelineQuery.data?.nodes.find((node) => node.id === editingNodeId) ?? null,
    [editingNodeId, pipelineQuery.data?.nodes]
  );

  const sortedCategories = useMemo(() => {
    const categories = operationsQuery.data?.categories;
    if (!categories) {
      return [];
    }

    return Object.entries(categories).sort((first, second) => first[1].order - second[1].order);
  }, [operationsQuery.data?.categories]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryId]: !(current[categoryId] ?? sortedCategories[0]?.[0] === categoryId),
    }));
  };

  const openNodeModal = useCallback(
    (nodeId: string) => {
      const node = pipelineQuery.data?.nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      setEditingNodeId(node.id);
      setConfigText(JSON.stringify(node.config ?? {}, null, 2));
      setModalError(undefined);
      setPreview(null);
      setPreviewInfo(undefined);
      setSelectedFile(null);

      const cfg = node.config ?? {};
      const currentDatasourceId = typeof cfg.datasource_id === 'string' ? cfg.datasource_id : '';
      setDatasourceId(currentDatasourceId);
    },
    [pipelineQuery.data?.nodes]
  );

  const closeModal = () => {
    setEditingNodeId(null);
  };

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

  const onSaveNodeConfig = async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const parsedConfig = parseConfigText(configText);
      if (datasourceId) {
        parsedConfig.datasource_id = datasourceId;
      }

      await patchNodeMutation.mutateAsync({
        nodeId: editingNode.id,
        payload: {
          config: parsedConfig,
        },
      });
      closeModal();
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
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

  const onUploadFile = async () => {
    if (!selectedFile || !editingNode) {
      return;
    }

    setPreviewInfo(undefined);
    setModalError(undefined);

    try {
      const uploaded = await uploadDatasource(selectedFile, selectedFile.name);
      setDatasourceId(uploaded.id);
      setPreviewInfo(
        'Файл загружен. Если статус не ready, подождите и нажмите «Проверить предпросмотр».'
      );

      const parsedConfig = parseConfigText(configText);
      parsedConfig.datasource_id = uploaded.id;
      setConfigText(JSON.stringify(parsedConfig, null, 2));

      await patchNodeMutation.mutateAsync({
        nodeId: editingNode.id,
        payload: {
          config: parsedConfig,
        },
      });
    } catch (error) {
      setModalError(extractError(error, 'Не удалось загрузить файл'));
    }
  };

  const onFetchPreview = async () => {
    if (!datasourceId) {
      setModalError('Сначала загрузите файл или укажите datasource_id');
      return;
    }

    setPreviewInfo(undefined);
    setModalError(undefined);

    try {
      const datasource = await getDatasourceDetail(datasourceId);
      if (datasource.status !== 'ready') {
        setPreview(null);
        setPreviewInfo(`Источник в статусе ${datasource.status}. Данные ещё обрабатываются.`);
        return;
      }

      const previewData = await previewDatasource(datasourceId, 10);
      setPreview(previewData);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось получить предпросмотр'));
    }
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
