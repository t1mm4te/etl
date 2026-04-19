import { useCallback, useMemo, useState } from 'react';
import {
  getNodeInputColumns,
  getPipelineRun,
  getDatasourceDetail,
  listPipelineRuns,
  previewDatasource,
  previewNodeRun,
  runPipeline,
  uploadDatasource,
} from '../../../api/pipelines';
import type { Edge, Node as ApiNode, NodeConfig, NodeRun } from '../../../api/types';
import { extractError } from '../../../lib/extractError';
import { usePipelineEditorStore } from '../../../store/pipelineEditorStore';

type UseNodeConfigModalStateParams = {
  pipelineId: string;
  nodes: ApiNode[] | undefined;
  edges: Edge[] | undefined;
  nodeRuns: NodeRun[] | undefined;
  saveNodeConfig: (nodeId: string, config: NodeConfig) => Promise<void>;
};

type NodeKind = 'source' | 'transform' | 'sink';

const SOURCE_TYPES = new Set(['source_file', 'source_db']);
const SINK_TYPES = new Set(['export_file']);

function getNodeKind(operationType: string): NodeKind {
  if (SOURCE_TYPES.has(operationType)) {
    return 'source';
  }
  if (SINK_TYPES.has(operationType)) {
    return 'sink';
  }
  return 'transform';
}

export function useNodeConfigModalState({
  pipelineId,
  nodes,
  edges,
  nodeRuns,
  saveNodeConfig,
}: UseNodeConfigModalStateParams) {
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [availableColumnsByPort, setAvailableColumnsByPort] = useState<Record<string, string[]>>(
    {}
  );

  const editingNodeId = usePipelineEditorStore((state) => state.editingNodeId);
  const config = usePipelineEditorStore((state) => state.config);
  const selectedFile = usePipelineEditorStore((state) => state.selectedFile);
  const uploadedDatasourceId = usePipelineEditorStore((state) => state.uploadedDatasourceId);
  const inputPreview = usePipelineEditorStore((state) => state.inputPreview);
  const leftInputPreview = usePipelineEditorStore((state) => state.leftInputPreview);
  const rightInputPreview = usePipelineEditorStore((state) => state.rightInputPreview);
  const resultPreview = usePipelineEditorStore((state) => state.resultPreview);
  const isPreviewLoading = usePipelineEditorStore((state) => state.isPreviewLoading);
  const activePreviewTab = usePipelineEditorStore((state) => state.activePreviewTab);
  const previewInfo = usePipelineEditorStore((state) => state.previewInfo);
  const modalError = usePipelineEditorStore((state) => state.modalError);
  const openModalState = usePipelineEditorStore((state) => state.openNodeModal);
  const closeModalState = usePipelineEditorStore((state) => state.closeNodeModal);
  const setConfig = usePipelineEditorStore((state) => state.setConfig);
  const setSelectedFile = usePipelineEditorStore((state) => state.setSelectedFile);
  const setUploadedDatasourceId = usePipelineEditorStore((state) => state.setUploadedDatasourceId);
  const setInputPreview = usePipelineEditorStore((state) => state.setInputPreview);
  const setLeftInputPreview = usePipelineEditorStore((state) => state.setLeftInputPreview);
  const setRightInputPreview = usePipelineEditorStore((state) => state.setRightInputPreview);
  const setResultPreview = usePipelineEditorStore((state) => state.setResultPreview);
  const setIsPreviewLoading = usePipelineEditorStore((state) => state.setIsPreviewLoading);
  const setActivePreviewTab = usePipelineEditorStore((state) => state.setActivePreviewTab);
  const setPreviewInfo = usePipelineEditorStore((state) => state.setPreviewInfo);
  const setModalError = usePipelineEditorStore((state) => state.setModalError);
  const setRunId = usePipelineEditorStore((state) => state.setRunId);

  const editingNode = useMemo(
    () => nodes?.find((node) => node.id === editingNodeId) ?? null,
    [editingNodeId, nodes]
  );

  const nodeKind = useMemo<NodeKind>(() => {
    if (!editingNode) {
      return 'transform';
    }
    return getNodeKind(editingNode.operation_type);
  }, [editingNode]);

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

  const getSuccessfulNodeRun = useCallback(
    (nodeId: string, runs: NodeRun[] | undefined = nodeRuns) =>
      runs?.find((run) => run.node === nodeId && run.status === 'success') ?? null,
    [nodeRuns]
  );

  const waitForRunCompletion = useCallback(async (runId: string) => {
    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const runDetail = await getPipelineRun(runId);
      if (runDetail.status === 'success' || runDetail.status === 'failed') {
        return runDetail;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
    }

    throw new Error('Не дождались завершения фонового запуска пайплайна для предпросмотра');
  }, []);

  const resolveNodeRunsForPreview = useCallback(async () => {
    if (nodeRuns && nodeRuns.length > 0) {
      return nodeRuns;
    }

    const runs = await listPipelineRuns(pipelineId);
    const latestCompletedRun = runs.find(
      (run) => run.status === 'success' || run.status === 'failed'
    );

    if (!latestCompletedRun) {
      return null;
    }

    setRunId(latestCompletedRun.id);
    const runDetail = await getPipelineRun(latestCompletedRun.id);
    return runDetail.node_runs;
  }, [nodeRuns, pipelineId, setRunId]);

  const loadAvailableColumns = useCallback(
    async (nodeId: string) => {
      try {
        const response = await getNodeInputColumns(pipelineId, nodeId);
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
    [pipelineId]
  );

  const fetchSourcePreview = useCallback(
    async (datasourceId: string) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);
      setInputPreview(null);
      setLeftInputPreview(null);
      setRightInputPreview(null);

      try {
        const datasource = await getDatasourceDetail(datasourceId);
        if (datasource.status !== 'ready') {
          setResultPreview(null);
          setPreviewInfo(`Источник в статусе ${datasource.status}. Данные ещё обрабатываются.`);
          return;
        }

        const previewData = await previewDatasource(datasourceId, 10);
        setResultPreview(previewData);
      } catch (error) {
        setModalError(extractError(error, 'Не удалось получить предпросмотр'));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      setInputPreview,
      setIsPreviewLoading,
      setLeftInputPreview,
      setModalError,
      setPreviewInfo,
      setResultPreview,
      setRightInputPreview,
    ]
  );

  const fetchNodePreviewsFromRuns = useCallback(
    async (node: ApiNode, runsOverride?: NodeRun[]) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);

      try {
        if (getNodeKind(node.operation_type) !== 'source') {
          const incomingEdges = (edges ?? []).filter((edge) => edge.target_node === node.id);

          if (incomingEdges.length === 0) {
            setInputPreview(null);
            setLeftInputPreview(null);
            setRightInputPreview(null);
          } else {
            const previewsByPort: Record<string, typeof inputPreview> = {};

            for (const incomingEdge of incomingEdges) {
              let preview = null;
              const upstreamRun = getSuccessfulNodeRun(incomingEdge.source_node, runsOverride);

              if (upstreamRun) {
                preview = await previewNodeRun(upstreamRun.id, 10);
              } else {
                const upstreamNode = nodes?.find((item) => item.id === incomingEdge.source_node);
                const upstreamDatasourceId = upstreamNode?.config?.datasource_id;
                if (typeof upstreamDatasourceId === 'string' && upstreamDatasourceId) {
                  const upstreamDatasource = await getDatasourceDetail(upstreamDatasourceId);
                  if (upstreamDatasource.status === 'ready') {
                    preview = await previewDatasource(upstreamDatasourceId, 10);
                  }
                }
              }

              const port = incomingEdge.target_port || 'main';
              previewsByPort[port] = preview;
            }

            setInputPreview(previewsByPort.main ?? null);
            setLeftInputPreview(previewsByPort.left ?? previewsByPort.main ?? null);
            setRightInputPreview(previewsByPort.right ?? null);
          }
        }

        const ownRun = getSuccessfulNodeRun(node.id, runsOverride);
        if (ownRun) {
          const ownPreview = await previewNodeRun(ownRun.id, 10);
          setResultPreview(ownPreview);
        } else {
          setResultPreview(null);
        }

        if (node.operation_type === 'join') {
          setActivePreviewTab('left_input');
        } else {
          setActivePreviewTab(getNodeKind(node.operation_type) === 'source' ? 'result' : 'input');
        }
      } catch (error) {
        setInputPreview(null);
        setLeftInputPreview(null);
        setRightInputPreview(null);
        setResultPreview(null);
        setModalError(
          extractError(error, 'Не удалось получить предпросмотр по последнему запуску')
        );
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      edges,
      getSuccessfulNodeRun,
      nodes,
      setActivePreviewTab,
      setInputPreview,
      setIsPreviewLoading,
      setLeftInputPreview,
      setModalError,
      setPreviewInfo,
      setResultPreview,
      setRightInputPreview,
    ]
  );

  const openNodeModal = useCallback(
    async (nodeId: string) => {
      const node = nodes?.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      const cfg = node.config ?? {};
      const currentDatasourceId = typeof cfg.datasource_id === 'string' ? cfg.datasource_id : '';
      openModalState(node.id, { ...(node.config ?? {}) }, currentDatasourceId);
      await loadAvailableColumns(node.id);

      const kind = getNodeKind(node.operation_type);
      if (kind === 'source' && currentDatasourceId) {
        await fetchSourcePreview(currentDatasourceId);
      }

      if (kind !== 'source') {
        const runsForPreview = await resolveNodeRunsForPreview();
        await fetchNodePreviewsFromRuns(node, runsForPreview ?? undefined);
      }
    },
    [
      fetchNodePreviewsFromRuns,
      fetchSourcePreview,
      loadAvailableColumns,
      nodes,
      openModalState,
      resolveNodeRunsForPreview,
    ]
  );

  const closeModal = useCallback(() => {
    setAvailableColumns([]);
    setAvailableColumnsByPort({});
    closeModalState();
  }, [closeModalState]);

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const nextConfig = uploadedDatasourceId
        ? { ...config, datasource_id: uploadedDatasourceId }
        : config;
      await saveNodeConfig(editingNode.id, nextConfig);
      closeModal();
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
    }
  }, [closeModal, config, editingNode, saveNodeConfig, setModalError, uploadedDatasourceId]);

  const onUploadFile = useCallback(async () => {
    if (!selectedFile || !editingNode) {
      return;
    }

    setPreviewInfo(undefined);
    setModalError(undefined);

    try {
      const uploaded = await uploadDatasource(selectedFile, selectedFile.name);
      setUploadedDatasourceId(uploaded.id);
      setPreviewInfo('Файл загружен. Загружаем предпросмотр...');

      const nextConfig = { ...config, datasource_id: uploaded.id };
      setConfig(nextConfig);

      await saveNodeConfig(editingNode.id, nextConfig);
      await fetchSourcePreview(uploaded.id);
      await loadAvailableColumns(editingNode.id);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось загрузить файл'));
    }
  }, [
    config,
    editingNode,
    fetchSourcePreview,
    saveNodeConfig,
    selectedFile,
    setConfig,
    setModalError,
    setPreviewInfo,
    setUploadedDatasourceId,
    loadAvailableColumns,
  ]);

  const onRefreshSourcePreview = useCallback(async () => {
    if (!uploadedDatasourceId) {
      setModalError('Сначала загрузите файл');
      return;
    }

    await fetchSourcePreview(uploadedDatasourceId);
  }, [fetchSourcePreview, setModalError, uploadedDatasourceId]);

  const onApplyPreview = useCallback(async () => {
    if (!editingNode || nodeKind === 'source') {
      return;
    }

    setModalError(undefined);
    setPreviewInfo(undefined);
    setIsPreviewLoading(true);

    try {
      const nextConfig = uploadedDatasourceId
        ? { ...config, datasource_id: uploadedDatasourceId }
        : config;
      await saveNodeConfig(editingNode.id, nextConfig);

      if (nodeKind === 'transform') {
        setPreviewInfo(
          'Конфигурация сохранена. Запускаем пайплайн для обновления предпросмотра...'
        );
        const startedRun = await runPipeline(pipelineId);
        setRunId(startedRun.id);
        const completedRun = await waitForRunCompletion(startedRun.id);

        if (completedRun.status === 'failed') {
          throw new Error(
            completedRun.error_message || 'Фоновый запуск пайплайна завершился с ошибкой'
          );
        }

        setPreviewInfo('Пайплайн выполнен. Загружаем свежий предпросмотр...');
        await fetchNodePreviewsFromRuns(editingNode, completedRun.node_runs);
        setActivePreviewTab('result');
        setPreviewInfo('Предпросмотр обновлен.');
        return;
      }

      await fetchNodePreviewsFromRuns(editingNode);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось применить настройки для предпросмотра'));
      setIsPreviewLoading(false);
    }
  }, [
    config,
    editingNode,
    fetchNodePreviewsFromRuns,
    nodeKind,
    pipelineId,
    saveNodeConfig,
    setActivePreviewTab,
    setIsPreviewLoading,
    setModalError,
    setPreviewInfo,
    setRunId,
    uploadedDatasourceId,
    waitForRunCompletion,
  ]);

  return {
    editingNode,
    nodeKind,
    hasIncomingData,
    config,
    modalError,
    inputPreview,
    leftInputPreview,
    rightInputPreview,
    resultPreview,
    isPreviewLoading,
    activePreviewTab,
    previewInfo,
    availableColumns,
    availableColumnsByPort,
    inputNodeLabelsByPort,
    selectedFile,
    onApplyPreview,
    onRefreshSourcePreview,
    onSaveNodeConfig,
    onUploadFile,
    openNodeModal,
    closeModal,
    setConfig,
    setActivePreviewTab,
    setSelectedFile,
  };
}
