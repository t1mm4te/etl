import { useCallback, useState } from 'react';
import type {
  Edge,
  Node as ApiNode,
  NodeConfig,
  NodeRun,
  PreviewResponse,
  SourceFile,
} from '../../../shared/api/types';
import { getDatasourceDetail, getSourceFileDetail } from '../../../shared/api/pipelines';
import { useNodeColumns } from './useNodeColumns';
import { useSourceNodePreviewActions } from './useSourceNodePreviewActions';
import { useTransformNodePreviewActions } from './useTransformNodePreviewActions';

export type NodeKind = 'source' | 'transform' | 'sink';

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

function getNodeKind(operationType: string): NodeKind {
  if (operationType === 'source_file' || operationType === 'source_db') {
    return 'source';
  }
  if (operationType === 'export_file') {
    return 'sink';
  }
  return 'transform';
}

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

  // Modal state
  const [config, setConfig] = useState<NodeConfig>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>();
  const [selectedSheetName, setSelectedSheetName] = useState<string | undefined>();
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [sourceFileId, setSourceFileId] = useState<string>('');
  const [sourceFileMetadata, setSourceFileMetadata] = useState<SourceFile | null>(null);
  const [uploadedDatasourceId, setUploadedDatasourceId] = useState<string>('');
  const [modalError, setModalError] = useState<string | undefined>();

  // Preview state
  const [inputPreview, setInputPreview] = useState<PreviewResponse | null>(null);
  const [leftInputPreview, setLeftInputPreview] = useState<PreviewResponse | null>(null);
  const [rightInputPreview, setRightInputPreview] = useState<PreviewResponse | null>(null);
  const [resultPreview, setResultPreview] = useState<PreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewRowLimit, setPreviewRowLimit] = useState(10);

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
    loadAvailableColumns,
    closeModal,
    setConfig,
    setSelectedFile,
    setSelectedFileName,
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

  const {
    resolveNodeRunsForPreview,
    fetchNodePreviewsFromRuns,
    onSaveNodeConfig: onSaveTransformNodeConfig,
    onApplyPreview,
    onPreviewRowLimitChange: onTransformPreviewRowLimitChange,
  } = useTransformNodePreviewActions({
    pipelineId,
    nodeRuns,
    nodes,
    edges,
    editingNode,
    nodeKind,
    config,
    uploadedDatasourceId,
    setPreviewRowLimit,
    previewRowLimit,
    saveNodeConfig,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setModalError,
  });

  const openNodeModal = useCallback(
    async (nodeId: string) => {
      const node = nodes?.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      setConfig(node.config ?? {});
      setSelectedFile(null);
      setSelectedFileName(undefined);
      setSelectedSheetName(undefined);
      setExcelSheetNames([]);
      setSourceFileId('');
      setSourceFileMetadata(null);
      setUploadedDatasourceId('');
      setModalError(undefined);
      setInputPreview(null);
      setLeftInputPreview(null);
      setRightInputPreview(null);
      setResultPreview(null);
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
      sourceFileId,
      sourceFileMetadata,
      availableColumns,
      availableColumnsByPort,
      inputNodeLabelsByPort,
      modalError,
      previewRowLimit,
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
    },
  };
}
