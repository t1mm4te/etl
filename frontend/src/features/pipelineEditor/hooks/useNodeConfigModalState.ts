import { useCallback, useState } from 'react';
import type {
  Edge,
  Node as ApiNode,
  NodeConfig,
  NodeRun,
  PreviewResponse,
} from '../../../shared/api/types';
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
      await loadAvailableColumns(node.id);

      const kind = getNodeKind(node.operation_type);
      const currentDatasourceId =
        typeof node.config?.datasource_id === 'string' ? node.config.datasource_id : '';

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
