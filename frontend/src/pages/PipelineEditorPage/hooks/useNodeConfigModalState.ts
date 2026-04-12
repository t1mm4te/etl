import { useCallback, useMemo } from 'react';
import {
  getDatasourceDetail,
  previewDatasource,
  previewNodeRun,
  uploadDatasource,
} from '../../../api/pipelines';
import type { Edge, Node as ApiNode, NodeConfig, NodeRun } from '../../../api/types';
import { extractError } from '../../../lib/extractError';
import { usePipelineEditorStore } from '../../../store/pipelineEditorStore';

function parseConfigText(configText: string): NodeConfig {
  const parsed = JSON.parse(configText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Конфиг должен быть JSON-объектом');
  }
  return parsed as NodeConfig;
}

type UseNodeConfigModalStateParams = {
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
  nodes,
  edges,
  nodeRuns,
  saveNodeConfig,
}: UseNodeConfigModalStateParams) {
  const editingNodeId = usePipelineEditorStore((state) => state.editingNodeId);
  const configText = usePipelineEditorStore((state) => state.configText);
  const selectedFile = usePipelineEditorStore((state) => state.selectedFile);
  const uploadedDatasourceId = usePipelineEditorStore((state) => state.uploadedDatasourceId);
  const inputPreview = usePipelineEditorStore((state) => state.inputPreview);
  const resultPreview = usePipelineEditorStore((state) => state.resultPreview);
  const isPreviewLoading = usePipelineEditorStore((state) => state.isPreviewLoading);
  const activePreviewTab = usePipelineEditorStore((state) => state.activePreviewTab);
  const previewInfo = usePipelineEditorStore((state) => state.previewInfo);
  const modalError = usePipelineEditorStore((state) => state.modalError);
  const openModalState = usePipelineEditorStore((state) => state.openNodeModal);
  const closeModalState = usePipelineEditorStore((state) => state.closeNodeModal);
  const setConfigText = usePipelineEditorStore((state) => state.setConfigText);
  const setSelectedFile = usePipelineEditorStore((state) => state.setSelectedFile);
  const setUploadedDatasourceId = usePipelineEditorStore((state) => state.setUploadedDatasourceId);
  const setInputPreview = usePipelineEditorStore((state) => state.setInputPreview);
  const setResultPreview = usePipelineEditorStore((state) => state.setResultPreview);
  const setIsPreviewLoading = usePipelineEditorStore((state) => state.setIsPreviewLoading);
  const setActivePreviewTab = usePipelineEditorStore((state) => state.setActivePreviewTab);
  const setPreviewInfo = usePipelineEditorStore((state) => state.setPreviewInfo);
  const setModalError = usePipelineEditorStore((state) => state.setModalError);

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

  const getSuccessfulNodeRun = useCallback(
    (nodeId: string) => nodeRuns?.find((run) => run.node === nodeId && run.status === 'success') ?? null,
    [nodeRuns]
  );

  const fetchSourcePreview = useCallback(
    async (datasourceId: string) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);
      setInputPreview(null);

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
    [setInputPreview, setIsPreviewLoading, setModalError, setPreviewInfo, setResultPreview]
  );

  const fetchNodePreviewsFromRuns = useCallback(
    async (node: ApiNode) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);

      try {
        if (getNodeKind(node.operation_type) !== 'source') {
          const incomingEdge = edges?.find((edge) => edge.target_node === node.id);

          if (incomingEdge) {
            const upstreamRun = getSuccessfulNodeRun(incomingEdge.source_node);
            if (upstreamRun) {
              const upstreamPreview = await previewNodeRun(upstreamRun.id, 10);
              setInputPreview(upstreamPreview);
            } else {
              const upstreamNode = nodes?.find((item) => item.id === incomingEdge.source_node);
              const upstreamDatasourceId = upstreamNode?.config?.datasource_id;
              if (typeof upstreamDatasourceId === 'string' && upstreamDatasourceId) {
                const upstreamDatasource = await getDatasourceDetail(upstreamDatasourceId);
                if (upstreamDatasource.status === 'ready') {
                  const upstreamPreview = await previewDatasource(upstreamDatasourceId, 10);
                  setInputPreview(upstreamPreview);
                } else {
                  setInputPreview(null);
                }
              } else {
                setInputPreview(null);
              }
            }
          } else {
            setInputPreview(null);
          }
        }

        const ownRun = getSuccessfulNodeRun(node.id);
        if (ownRun) {
          const ownPreview = await previewNodeRun(ownRun.id, 10);
          setResultPreview(ownPreview);
        } else {
          setResultPreview(null);
        }

        setActivePreviewTab(getNodeKind(node.operation_type) === 'source' ? 'result' : 'input');
      } catch (error) {
        setInputPreview(null);
        setResultPreview(null);
        setModalError(extractError(error, 'Не удалось получить предпросмотр по последнему запуску'));
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
      setModalError,
      setPreviewInfo,
      setResultPreview,
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
      openModalState(node.id, JSON.stringify(node.config ?? {}, null, 2), currentDatasourceId);

      const kind = getNodeKind(node.operation_type);
      if (kind === 'source' && currentDatasourceId) {
        await fetchSourcePreview(currentDatasourceId);
      }

      if (kind !== 'source') {
        await fetchNodePreviewsFromRuns(node);
      }
    },
    [fetchNodePreviewsFromRuns, fetchSourcePreview, nodes, openModalState]
  );

  const closeModal = useCallback(() => {
    closeModalState();
  }, [closeModalState]);

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const parsedConfig = parseConfigText(configText);
      if (uploadedDatasourceId) {
        parsedConfig.datasource_id = uploadedDatasourceId;
      }

      await saveNodeConfig(editingNode.id, parsedConfig);
      closeModal();
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
    }
  }, [closeModal, configText, editingNode, saveNodeConfig, setModalError, uploadedDatasourceId]);

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

      const parsedConfig = parseConfigText(configText);
      parsedConfig.datasource_id = uploaded.id;
      setConfigText(JSON.stringify(parsedConfig, null, 2));

      await saveNodeConfig(editingNode.id, parsedConfig);
      await fetchSourcePreview(uploaded.id);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось загрузить файл'));
    }
  }, [
    configText,
    editingNode,
    fetchSourcePreview,
    saveNodeConfig,
    selectedFile,
    setConfigText,
    setModalError,
    setPreviewInfo,
    setUploadedDatasourceId,
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
    try {
      const parsedConfig = parseConfigText(configText);
      if (uploadedDatasourceId) {
        parsedConfig.datasource_id = uploadedDatasourceId;
      }

      await saveNodeConfig(editingNode.id, parsedConfig);
      setPreviewInfo(
        'Конфигурация сохранена. По текущей спецификации API результат узла обновляется после запуска пайплайна.'
      );
      await fetchNodePreviewsFromRuns(editingNode);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось применить настройки для предпросмотра'));
    }
  }, [
    configText,
    editingNode,
    fetchNodePreviewsFromRuns,
    nodeKind,
    saveNodeConfig,
    setModalError,
    setPreviewInfo,
    uploadedDatasourceId,
  ]);

  return {
    editingNode,
    nodeKind,
    hasIncomingData,
    configText,
    modalError,
    inputPreview,
    resultPreview,
    isPreviewLoading,
    activePreviewTab,
    previewInfo,
    selectedFile,
    onApplyPreview,
    onRefreshSourcePreview,
    onSaveNodeConfig,
    onUploadFile,
    openNodeModal,
    closeModal,
    setConfigText,
    setActivePreviewTab,
    setSelectedFile,
  };
}
