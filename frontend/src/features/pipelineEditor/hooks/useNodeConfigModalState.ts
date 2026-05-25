import { useCallback, useState } from 'react';
import type {
  Edge,
  Node as ApiNode,
  NodeConfig,
  NodeRun,
  PreviewResponse,
  SourceFile,
} from '../../../shared/api/types';
import {
  getDatasourceDetail,
  getSourceFileDetail,
  listPipelineRuns,
  getPipelineRun,
  runPipelinePreview,
} from '../../../shared/api/pipelines';
import { useNodeColumns } from './useNodeColumns';
import { useSourceNodePreviewActions } from './useSourceNodePreviewActions.ts';
import {
  fetchTransformPreviewFromRuns,
  runTransformPreview,
} from './useTransformNodePreviewActions';
import { usePipelineEditorStore } from '../store/pipelineEditorStore';
import { buildNextNodeConfig } from '../utils/nodePreviewUtils';
import { type PreviewTab } from '../types/nodeConfigModalTypes';
import { getNodeKind } from '../utils/getNodeKind.ts';

type UseNodeConfigModalStateParams = {
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

export function useNodeConfigModalState({
  pipelineId,
  editingNodeId,
  onClose,
  nodes,
  edges,
  nodeRuns,
  saveNodeConfig,
}: UseNodeConfigModalStateParams) {
  const editingNode = nodes?.find((node) => node.id === editingNodeId) ?? null;
  const nodeKind = editingNode ? getNodeKind(editingNode.operation_type) : 'source';

  const [config, setConfig] = useState<NodeConfig>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>();
  const [selectedSheetName, setSelectedSheetName] = useState<string | undefined>();
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [sourceFileId, setSourceFileId] = useState<string>('');
  const [sourceFileMetadata, setSourceFileMetadata] = useState<SourceFile | null>(null);
  const [uploadedDatasourceId, setUploadedDatasourceId] = useState<string>('');
  const [isSourceFileUploading, setIsSourceFileUploading] = useState(false);
  const [sourceFileUploadProgress, setSourceFileUploadProgress] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | undefined>();

  const resetSourceState = useCallback(() => {
    setSelectedFile(null);
    setSelectedFileName(undefined);
    setSelectedSheetName(undefined);
    setExcelSheetNames([]);
    setSourceFileId('');
    setSourceFileMetadata(null);
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

  const resetPreviewState = useCallback(() => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
    setIsPreviewLoading(false);
    setPreviewRowLimit(15);
    setActivePreviewTab('input');
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

  const {
    fetchSourcePreview,
    onSaveNodeConfig: onSaveSourceNodeConfig,
    onFileChange: onSourceFileChange,
    onPreviewRowLimitChange: onSourcePreviewRowLimitChange,
    onSheetNameChange: onSourceSheetNameChange,
  } = useSourceNodePreviewActions({
    editingNode,
    config,
    uploadedDatasourceId,
    sourceFileId,
    sourceFileMetadata,
    selectedFileName,
    selectedSheetName,
    excelSheetNames,
    previewRowLimit,
    saveNodeConfig,
    closeModal,
    setConfig,
    setSelectedFile,
    setSelectedFileName,
    setIsSourceFileUploading,
    setSourceFileUploadProgress,
    setSelectedSheetName,
    setExcelSheetNames,
    setUploadedDatasourceId,
    setSourceFileId,
    setSourceFileMetadata,
    setPreviewRowLimit,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setModalError,
  });

  const setRunId = usePipelineEditorStore((s) => s.setRunId);

  const getNextConfig = useCallback(
    () => buildNextNodeConfig(config, uploadedDatasourceId),
    [config, uploadedDatasourceId]
  );

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

  const fetchNodePreviewsFromRuns = useCallback(
    async (node: ApiNode, runsOverride?: NodeRun[], rowLimit = previewRowLimit) => {
      setIsPreviewLoading(true);
      setModalError(undefined);

      try {
        const previews = await fetchTransformPreviewFromRuns({
          node,
          nodes,
          edges,
          nodeRuns: runsOverride ?? nodeRuns ?? null,
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
      nodeRuns,
      previewRowLimit,
      setInputPreview,
      setIsPreviewLoading,
      setLeftInputPreview,
      setResultPreview,
      setRightInputPreview,
      setModalError,
    ]
  );

  const onSaveTransformNodeConfig = useCallback(async () => {
    if (!editingNode) return;
    setModalError(undefined);
    try {
      const nextConfig = getNextConfig();
      await saveNodeConfig(editingNode.id, nextConfig);
    } catch (error) {
      setModalError(String(error));
    }
  }, [editingNode, getNextConfig, saveNodeConfig, setModalError]);

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
        runPipelinePreview,
        getPipelineRun,
      });

      setRunId(startedRun.id);
      await fetchNodePreviewsFromRuns(editingNode, completedRun.node_runs);
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
        void fetchNodePreviewsFromRuns(editingNode, undefined, limit);
      }
    },
    [editingNode, nodeKind, setPreviewRowLimit, fetchNodePreviewsFromRuns]
  );

  const openNodeModal = useCallback(
    async (nodeId: string) => {
      const node = nodes?.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      setConfig(node.config ?? {});
      resetSourceState();
      resetPreviewState();
      setActivePreviewTab('input');
      setModalError(undefined);
      await loadAvailableColumns(node.id);

      const kind = getNodeKind(node.operation_type);
      const currentDatasourceId =
        typeof node.config?.datasource_id === 'string' ? node.config.datasource_id : '';
      const currentSourceFileId =
        typeof node.config?.source_file_id === 'string' ? node.config.source_file_id : '';

      const resolvedSourceFileId = currentSourceFileId || currentDatasourceId;

      if (kind === 'source' && resolvedSourceFileId) {
        try {
          setSourceFileId(resolvedSourceFileId);
          const sourceFile = await getSourceFileDetail(resolvedSourceFileId);
          setSourceFileMetadata(sourceFile);
          setSelectedFileName(sourceFile.filename);
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

      if (kind !== 'source') {
        const runsForPreview = await resolveNodeRunsForPreview();
        await fetchNodePreviewsFromRuns(node, runsForPreview ?? undefined);
      }
    },
    [
      fetchNodePreviewsFromRuns,
      fetchSourcePreview,
      resetSourceState,
      resetPreviewState,
      loadAvailableColumns,
      nodes,
      resolveNodeRunsForPreview,
    ]
  );

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
      sourceFileId,
      sourceFileMetadata,
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
      onFileChange: onSourceFileChange,
      onSaveConfig: nodeKind === 'source' ? onSaveSourceNodeConfig : onSaveTransformNodeConfig,
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
