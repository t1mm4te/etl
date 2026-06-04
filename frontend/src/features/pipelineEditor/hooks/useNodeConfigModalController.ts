import { useCallback, useState } from 'react';
import type {
  Edge,
  Node as ApiNode,
  NodeConfig,
  NodeRun,
  PreviewResponse,
} from '../../../shared/api/types.ts';
import {
  getDatasourceDetail,
  getSourceFileDetail,
  listPipelineRuns,
  getPipelineRun,
} from '../../../shared/api/pipelines.ts';
import { useNodeColumns } from './useNodeColumns.ts';
import {
  fetchTransformPreviewFromRuns,
  runTransformPreview,
} from '../services/transformPreviewService.ts';
import { usePipelineEditorStore } from '../store/pipelineEditorStore.ts';
import { buildNextNodeConfig } from '../utils/nodePreviewUtils.ts';
import { type PreviewTab } from '../types/nodeConfigModalTypes.ts';
import { getNodeKind } from '../utils/getNodeKind.ts';
import {
  createDatasourceForSheet,
  uploadSourceAndCreateDatasource,
} from '../services/sourceNodeService.ts';
import { extractError } from '../../../shared/lib/extractError.ts';
import type { AxiosProgressEvent } from 'axios';
import { getSourceLabel } from '../utils/sourceNodePreviewUtils.ts';
import { fetchSourcePreviewData } from '../services/sourcePreviewService.ts';

type UseNodeConfigModalControllerParams = {
  pipelineId: string;
  editingNodeId: string | null;
  onClose: () => void;
  nodes: ApiNode[] | undefined;
  edges: Edge[] | undefined;
  nodeRuns: NodeRun[] | undefined;
  saveNodeConfig: (
    nodeId: string,
    config: NodeConfig,
    options?: { label?: string }
  ) => Promise<void>;
};

export function useNodeConfigModalController({
  pipelineId,
  editingNodeId,
  onClose,
  nodes,
  edges,
  nodeRuns,
  saveNodeConfig,
}: UseNodeConfigModalControllerParams) {
  const editingNode = nodes?.find((node) => node.id === editingNodeId) ?? null;
  const nodeKind = editingNode ? getNodeKind(editingNode.operation_type) : 'source';

  const [config, setConfig] = useState<NodeConfig>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>();
  const [selectedSheetName, setSelectedSheetName] = useState<string | undefined>();
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [uploadedDatasourceId, setUploadedDatasourceId] = useState<string>('');
  const [isSourceFileUploading, setIsSourceFileUploading] = useState(false);
  const [sourceFileUploadProgress, setSourceFileUploadProgress] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | undefined>();

  const resetSourceState = useCallback(() => {
    setSelectedFile(null);
    setSelectedFileName(undefined);
    setSelectedSheetName(undefined);
    setExcelSheetNames([]);
    setUploadedDatasourceId('');
    setIsSourceFileUploading(false);
    setSourceFileUploadProgress(null);
  }, []);

  // Preview state (local)
  const [inputPreview, setInputPreview] = useState<PreviewResponse | null>(null);
  const [leftInputPreview, setLeftInputPreview] = useState<PreviewResponse | null>(null);
  const [rightInputPreview, setRightInputPreview] = useState<PreviewResponse | null>(null);
  const [resultPreview, setResultPreview] = useState<PreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewRowLimit, setPreviewRowLimit] = useState(15);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('input');

  const resetPreviewState = useCallback((tab: PreviewTab = 'input') => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
    setIsPreviewLoading(false);
    setPreviewRowLimit(15);
    setActivePreviewTab(tab);
  }, []);

  const {
    availableColumns,
    availableColumnsByPort,
    hasIncomingData,
    inputNodeLabelsByPort,
    loadAvailableColumns,
    resetAvailableColumns,
  } = useNodeColumns({
    pipelineId,
    editingNode,
    nodes,
    edges,
  });

  const closeModal = useCallback(() => {
    resetAvailableColumns();
    onClose();
  }, [onClose, resetAvailableColumns]);

  const clearSourcePreviews = useCallback(() => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
  }, [setInputPreview, setLeftInputPreview, setResultPreview, setRightInputPreview]);

  const fetchSourcePreview = useCallback(
    async (datasourceId: string, limit = previewRowLimit) => {
      setIsPreviewLoading(true);
      setModalError(undefined);
      clearSourcePreviews();

      try {
        const result = await fetchSourcePreviewData({
          datasourceId,
          rowLimit: limit,
        });

        if (result.error) {
          setResultPreview(null);
          setModalError(result.error);
          return;
        }

        setResultPreview(result.preview);
      } catch (error) {
        setModalError(String(error));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [clearSourcePreviews, previewRowLimit]
  );

  const onUploadProgress = useCallback((progressEvent: AxiosProgressEvent) => {
    if (!progressEvent.total) return;
    const percent = Math.min(100, Math.round((progressEvent.loaded / progressEvent.total) * 100));
    setSourceFileUploadProgress(percent);
  }, []);

  const onSourceFileChange = useCallback(
    async (file: File | null) => {
      if (!editingNode || !file) {
        return;
      }

      if (editingNode.operation_type !== 'source_file') {
        setModalError('Автозагрузка файла доступна только для источника из файла');
        return;
      }

      setSelectedFile(file);
      setSelectedFileName(file.name);
      setModalError(undefined);
      setIsSourceFileUploading(true);
      setSourceFileUploadProgress(0);

      try {
        const result = await uploadSourceAndCreateDatasource({
          file,
          config,
          onUploadProgress,
        });
        const newConfig = result.readyConfig ?? result.uploadedConfig;

        setConfig(newConfig);
        setSelectedFileName(result.sourceFileName);
        setExcelSheetNames(result.sheetNames);
        setSelectedSheetName(result.defaultSheetName);
        setUploadedDatasourceId(result.datasourceId ?? '');
        setInputPreview(null);
        setLeftInputPreview(null);
        setRightInputPreview(null);
        setResultPreview(null);

        await saveNodeConfig(editingNode.id, newConfig, {
          label: getSourceLabel(result.datasourceName),
        });
        await fetchSourcePreview(result.datasourceId ?? '', previewRowLimit);
      } catch (error) {
        setModalError(extractError(error));
      } finally {
        setIsSourceFileUploading(false);
        setSourceFileUploadProgress(null);
      }
    },
    [config, editingNode, fetchSourcePreview, onUploadProgress, previewRowLimit, saveNodeConfig]
  );

  const onSourceSheetNameChange = useCallback(
    async (sheetName: string) => {
      setModalError(undefined);
      setSelectedSheetName(sheetName);

      if (!editingNode) {
        return;
      }

      const effectiveSourceFileId =
        typeof config.source_file_id === 'string'
          ? config.source_file_id
          : typeof config.datasource_id === 'string'
            ? config.datasource_id
            : '';

      if (!effectiveSourceFileId) {
        setModalError('Сначала загрузите файл, затем выберите лист.');
        return;
      }

      try {
        const result = await createDatasourceForSheet({
          sourceFileId: effectiveSourceFileId,
          sheetName,
          config,
          excelSheetNames,
        });

        setUploadedDatasourceId(result.datasourceId);
        setConfig(result.nextConfig);

        await saveNodeConfig(editingNode.id, result.nextConfig, {
          label: getSourceLabel(result.datasourceName),
        });
        fetchSourcePreview(result.datasourceId, previewRowLimit);
      } catch (error) {
        setModalError(String(error));
      }
    },
    [
      config,
      editingNode,
      excelSheetNames,
      fetchSourcePreview,
      previewRowLimit,
      saveNodeConfig,
      setConfig,
      setModalError,
      setSelectedSheetName,
      setUploadedDatasourceId,
    ]
  );

  const onSourcePreviewRowLimitChange = useCallback(
    (limit: number) => {
      setPreviewRowLimit(limit);
      if (uploadedDatasourceId) {
        void fetchSourcePreview(uploadedDatasourceId, limit);
      }
    },
    [fetchSourcePreview, setPreviewRowLimit, uploadedDatasourceId]
  );

  const setRunId = usePipelineEditorStore((s) => s.setRunId);

  const getNextConfig = useCallback(
    () => buildNextNodeConfig(config, uploadedDatasourceId),
    [config, uploadedDatasourceId]
  );

  const getIncomingSourceNodeIds = useCallback(
    (node: ApiNode) => {
      return Array.from(
        new Set(
          (edges ?? [])
            .filter((edge) => edge.target_node === node.id)
            .map((edge) => edge.source_node)
        )
      );
    },
    [edges]
  );

  const getRelevantPreviewNodeIds = useCallback(
    (node: ApiNode) => {
      return Array.from(new Set([...getIncomingSourceNodeIds(node), node.id]));
    },
    [getIncomingSourceNodeIds]
  );

  const resolveNodeRunMapForPreview = useCallback(
    async (node: ApiNode) => {
      const relevantNodeIds = getRelevantPreviewNodeIds(node);
      const resolvedRunsByNodeId: Record<string, NodeRun> = {};

      const currentRun = nodeRuns?.find((run) => run.node === node.id && run.status === 'success');
      if (currentRun) {
        resolvedRunsByNodeId[node.id] = currentRun;
      }

      const currentRunNodeIds = new Set(Object.keys(resolvedRunsByNodeId));
      const missingNodeIds = relevantNodeIds.filter((nodeId) => !currentRunNodeIds.has(nodeId));

      if (missingNodeIds.length === 0) {
        return Object.keys(resolvedRunsByNodeId).length > 0 ? resolvedRunsByNodeId : null;
      }

      const runs = await listPipelineRuns(pipelineId);
      const successfulRuns = runs.filter((run) => run.status === 'success');
      const runDetailCache = new Map<
        string,
        ReturnType<typeof getPipelineRun> extends Promise<infer T> ? T : never
      >();

      const loadRunDetail = async (runId: string) => {
        const cachedRunDetail = runDetailCache.get(runId);
        if (cachedRunDetail) {
          return cachedRunDetail;
        }

        const runDetail = await getPipelineRun(runId);
        runDetailCache.set(runId, runDetail);
        return runDetail;
      };

      for (const nodeId of missingNodeIds) {
        for (const run of successfulRuns) {
          const runDetail = await loadRunDetail(run.id);
          const matchingRun = runDetail.node_runs.find(
            (runItem) => runItem.node === nodeId && runItem.status === 'success'
          );

          if (!matchingRun) {
            continue;
          }

          resolvedRunsByNodeId[nodeId] = matchingRun;
          if (nodeId === node.id) {
            setRunId(runDetail.id);
          }
          break;
        }
      }

      return Object.keys(resolvedRunsByNodeId).length > 0 ? resolvedRunsByNodeId : null;
    },
    [getRelevantPreviewNodeIds, nodeRuns, pipelineId, setRunId]
  );

  const fetchNodePreviewsFromRuns = useCallback(
    async (
      node: ApiNode,
      runsOverride?: Record<string, NodeRun> | null,
      rowLimit = previewRowLimit
    ) => {
      setIsPreviewLoading(true);
      setModalError(undefined);

      try {
        const previews = await fetchTransformPreviewFromRuns({
          node,
          nodes,
          edges,
          nodeRunsByNodeId: runsOverride,
          rowLimit,
        });

        setInputPreview(previews.inputPreview);
        setLeftInputPreview(previews.leftInputPreview);
        setRightInputPreview(previews.rightInputPreview);
        setResultPreview(previews.resultPreview);
      } catch (error) {
        setInputPreview(null);
        setLeftInputPreview(null);
        setRightInputPreview(null);
        setResultPreview(null);
        setModalError(String(error));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      edges,
      nodes,
      previewRowLimit,
      setInputPreview,
      setIsPreviewLoading,
      setLeftInputPreview,
      setResultPreview,
      setRightInputPreview,
      setModalError,
    ]
  );

  const onApplyPreview = useCallback(async () => {
    if (!editingNode || nodeKind === 'source') return;

    setModalError(undefined);
    setActivePreviewTab('result');
    setIsPreviewLoading(true);

    try {
      const { startedRun, completedRun } = await runTransformPreview({
        pipelineId,
        editingNode,
        getNextConfig,
        saveNodeConfig,
      });

      setRunId(startedRun.id);
      await fetchNodePreviewsFromRuns(
        editingNode,
        completedRun.node_runs.reduce<Record<string, NodeRun>>((acc, run) => {
          if (run.status === 'success') {
            acc[run.node] = run;
          }
          return acc;
        }, {})
      );
    } catch (error) {
      setModalError(String(error));
      setIsPreviewLoading(false);
    }
  }, [
    editingNode,
    nodeKind,
    pipelineId,
    getNextConfig,
    saveNodeConfig,
    fetchNodePreviewsFromRuns,
    setActivePreviewTab,
    setIsPreviewLoading,
    setRunId,
  ]);

  const onTransformPreviewRowLimitChange = useCallback(
    (limit: number) => {
      setPreviewRowLimit(limit);
      if (editingNode && nodeKind !== 'source') {
        void resolveNodeRunMapForPreview(editingNode).then((runMap) =>
          fetchNodePreviewsFromRuns(editingNode, runMap ?? undefined, limit)
        );
      }
    },
    [
      editingNode,
      fetchNodePreviewsFromRuns,
      nodeKind,
      resolveNodeRunMapForPreview,
      setPreviewRowLimit,
    ]
  );

  const openNodeModal = useCallback(
    async (nodeId: string) => {
      const node = nodes?.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      const kind = getNodeKind(node.operation_type);
      const initialPreviewTab: PreviewTab =
        kind === 'source' ? 'input' : node.operation_type === 'join' ? 'left_input' : 'input';
      setConfig(node.config ?? {});
      resetSourceState();
      resetPreviewState(initialPreviewTab);
      setModalError(undefined);

      const currentDatasourceId =
        typeof node.config?.datasource_id === 'string' ? node.config.datasource_id : '';
      const currentSourceFileId =
        typeof node.config?.source_file_id === 'string' ? node.config.source_file_id : '';

      const resolvedSourceFileId = currentSourceFileId || currentDatasourceId;

      if (kind === 'source' && resolvedSourceFileId) {
        try {
          const sourceFile = await getSourceFileDetail(resolvedSourceFileId);
          setSelectedFileName(sourceFile.original_filename);
          setExcelSheetNames(sourceFile.sheets_metadata.map((sheet) => sheet.sheet_name));
        } catch {
          // Best effort only; a datasource preview may still be available below.
        }
      }

      if (kind === 'source' && currentDatasourceId) {
        setUploadedDatasourceId(currentDatasourceId);
        await fetchSourcePreview(currentDatasourceId);
        try {
          const datasourceDetail = await getDatasourceDetail(currentDatasourceId);
          if (datasourceDetail.sheet_name) {
            setSelectedSheetName(datasourceDetail.sheet_name);
          }
        } catch {
          // Preview already loaded above.
        }
      }

      if (kind === 'transform') {
        await loadAvailableColumns(node.id);
      }
      if (kind !== 'source') {
        const runMapForPreview = await resolveNodeRunMapForPreview(node);
        await fetchNodePreviewsFromRuns(node, runMapForPreview ?? undefined);
      }
    },
    [
      fetchNodePreviewsFromRuns,
      fetchSourcePreview,
      resetSourceState,
      resetPreviewState,
      loadAvailableColumns,
      nodes,
      resolveNodeRunMapForPreview,
    ]
  );

  const onSourceDbConnected = useCallback(
    async (datasourceId: string, datasourceName: string) => {
      if (!editingNode) {
        return;
      }

      const nextConfig: NodeConfig = {
        ...config,
        datasource_id: datasourceId,
      };

      setModalError(undefined);
      setConfig(nextConfig);
      setUploadedDatasourceId(datasourceId);

      try {
        await saveNodeConfig(editingNode.id, nextConfig, {
          label: datasourceName,
        });
        await fetchSourcePreview(datasourceId, previewRowLimit);
      } catch (error) {
        setModalError(extractError(error, 'Не удалось сохранить подключение к БД'));
        throw error;
      }
    },
    [config, editingNode, fetchSourcePreview, previewRowLimit, saveNodeConfig]
  );

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) return;
    setModalError(undefined);
    try {
      await saveNodeConfig(editingNode.id, config);
      closeModal();
    } catch (error) {
      setModalError(String(error));
    }
  }, [closeModal, config, editingNode, saveNodeConfig]);

  return {
    editingNode,
    nodeKind,
    hasIncomingData,
    openNodeModal,
    onSheetNameChange: nodeKind === 'source' ? onSourceSheetNameChange : undefined,
    onSourceFileChange,
    modalState: {
      node: editingNode,
      nodeKind,
      hasIncomingData,
      config,
      selectedFile,
      selectedFileName,
      selectedSheetName,
      excelSheetNames,
      isSourceFileUploading,
      sourceFileUploadProgress,
      availableColumns,
      availableColumnsByPort,
      inputNodeLabelsByPort,
      modalError,
      previewRowLimit,
      activePreviewTab,
    },
    previewState: {
      inputPreview,
      leftInputPreview,
      rightInputPreview,
      resultPreview,
      isPreviewLoading,
    },
    modalActions: {
      onClose: closeModal,
      onConfigChange: setConfig,
      onSaveNodeConfig,
      onFileChange: onSourceFileChange,
      onSourceDbConnected,
      onPreviewRowLimitChange:
        nodeKind === 'source' ? onSourcePreviewRowLimitChange : onTransformPreviewRowLimitChange,
    },
    previewActions: {
      onApplyPreview,
    },
    previewCallbacks: {
      onSetExcelSheetNames: setExcelSheetNames,
      onSetSelectedSheetName: setSelectedSheetName,
      onSetActivePreviewTab: setActivePreviewTab,
    },
  };
}
