import { useCallback, useMemo, useState } from 'react';
import type {
  Edge,
  Node as ApiNode,
  NodeConfig,
  NodeRun,
  PreviewResponse,
} from '../../../api/types';
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

function getStringArrayConfigValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string');
}

function getSourceFileNameFromNodeLabel(label: string): string | undefined {
  if (label.startsWith('Загрузка файла: ')) {
    return label.replace('Загрузка файла: ', '');
  }
  return undefined;
}

type ModalLocalState = {
  config: NodeConfig;
  modalError?: string;
  inputPreview: PreviewResponse | null;
  leftInputPreview: PreviewResponse | null;
  rightInputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
  isPreviewLoading: boolean;
  activePreviewTab: string;
  previewInfo: string;
  selectedFile: File | null;
  selectedFileName?: string;
  selectedSheetName?: string;
  excelSheetNames: string[];
  previewRowLimit: number;
  uploadedDatasourceId: string;
};

function getDefaultModalLocalState(): ModalLocalState {
  return {
    config: {},
    modalError: undefined,
    inputPreview: null,
    leftInputPreview: null,
    rightInputPreview: null,
    resultPreview: null,
    isPreviewLoading: false,
    activePreviewTab: 'input',
    previewInfo: '',
    selectedFile: null,
    selectedFileName: undefined,
    selectedSheetName: undefined,
    excelSheetNames: [],
    previewRowLimit: 10,
    uploadedDatasourceId: '',
  };
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
  const editingNode = useMemo(
    () => nodes?.find((n) => n.id === editingNodeId) ?? null,
    [editingNodeId, nodes]
  );

  const nodeKind = useMemo(() => {
    return editingNode ? getNodeKind(editingNode.operation_type) : ('source' as NodeKind);
  }, [editingNode]);

  // Local state
  const [modalLocalState, setModalLocalState] = useState<ModalLocalState>(() => {
    if (!editingNode) {
      return getDefaultModalLocalState();
    }

    const nodeConfig = editingNode.config ?? {};
    const nodeLabel = editingNode.label ?? '';
    const sourceFileName = getSourceFileNameFromNodeLabel(nodeLabel);
    const currentDatasourceId =
      typeof nodeConfig.datasource_id === 'string' ? nodeConfig.datasource_id : '';

    return {
      ...getDefaultModalLocalState(),
      config: nodeConfig,
      selectedFileName: sourceFileName,
      uploadedDatasourceId: currentDatasourceId,
      selectedSheetName:
        typeof nodeConfig.sheet_name === 'string' ? nodeConfig.sheet_name : undefined,
      excelSheetNames: getStringArrayConfigValue(nodeConfig.available_sheets),
    };
  });
  const [previewRowLimit, setPreviewRowLimit] = useState(10);
  const [activePreviewTab, setActivePreviewTab] = useState('input');

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
    setModalLocalState(getDefaultModalLocalState());
    setPreviewRowLimit(10);
    setActivePreviewTab('input');
    onClose();
  }, [onClose, resetAvailableColumns]);

  const setConfig = useCallback((config: NodeConfig) => {
    setModalLocalState((prev) => ({ ...prev, config }));
  }, []);

  const setSelectedFile = useCallback((file: File | null) => {
    setModalLocalState((prev) => ({ ...prev, selectedFile: file }));
  }, []);

  const setSelectedFileName = useCallback((fileName?: string) => {
    setModalLocalState((prev) => ({ ...prev, selectedFileName: fileName }));
  }, []);

  const setSelectedSheetName = useCallback((sheetName?: string) => {
    setModalLocalState((prev) => ({ ...prev, selectedSheetName: sheetName }));
  }, []);

  const setExcelSheetNames = useCallback((sheetNames: string[]) => {
    setModalLocalState((prev) => ({ ...prev, excelSheetNames: sheetNames }));
  }, []);

  const setUploadedDatasourceId = useCallback((id: string) => {
    setModalLocalState((prev) => ({ ...prev, uploadedDatasourceId: id }));
  }, []);

  const setInputPreview = useCallback((preview: PreviewResponse | null) => {
    setModalLocalState((prev) => ({ ...prev, inputPreview: preview }));
  }, []);

  const setLeftInputPreview = useCallback((preview: PreviewResponse | null) => {
    setModalLocalState((prev) => ({ ...prev, leftInputPreview: preview }));
  }, []);

  const setRightInputPreview = useCallback((preview: PreviewResponse | null) => {
    setModalLocalState((prev) => ({ ...prev, rightInputPreview: preview }));
  }, []);

  const setResultPreview = useCallback((preview: PreviewResponse | null) => {
    setModalLocalState((prev) => ({ ...prev, resultPreview: preview }));
  }, []);

  const setIsPreviewLoading = useCallback((loading: boolean) => {
    setModalLocalState((prev) => ({ ...prev, isPreviewLoading: loading }));
  }, []);

  const setModalError = useCallback((error?: string) => {
    setModalLocalState((prev) => ({ ...prev, modalError: error }));
  }, []);

  const {
    fetchSourcePreview,
    onSaveNodeConfig: onSaveSourceNodeConfig,
    onFileChange: onSourceFileChange,
    onPreviewRowLimitChange: onSourcePreviewRowLimitChange,
    onSheetNameChange: onSourceSheetNameChange,
  } = useSourceNodePreviewActions({
    editingNode,
    config: modalLocalState.config,
    uploadedDatasourceId: modalLocalState.uploadedDatasourceId,
    selectedSheetName: modalLocalState.selectedSheetName,
    excelSheetNames: modalLocalState.excelSheetNames,
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
    config: modalLocalState.config,
    uploadedDatasourceId: modalLocalState.uploadedDatasourceId,
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

  const modalState = {
    node: editingNode,
    nodeKind,
    hasIncomingData,
    config: modalLocalState.config,
    modalError: modalLocalState.modalError,
    inputPreview: modalLocalState.inputPreview,
    leftInputPreview: modalLocalState.leftInputPreview,
    rightInputPreview: modalLocalState.rightInputPreview,
    resultPreview: modalLocalState.resultPreview,
    isPreviewLoading: modalLocalState.isPreviewLoading,
    activePreviewTab,
    previewInfo: modalLocalState.previewInfo,
    selectedFile: modalLocalState.selectedFile,
    selectedFileName: modalLocalState.selectedFileName,
    selectedSheetName: modalLocalState.selectedSheetName,
    excelSheetNames: modalLocalState.excelSheetNames,
    previewRowLimit,
    uploadedDatasourceId: modalLocalState.uploadedDatasourceId,
    availableColumns,
    availableColumnsByPort,
    inputNodeLabelsByPort,
  };

  const previewState = {
    inputPreview: modalLocalState.inputPreview,
    leftInputPreview: modalLocalState.leftInputPreview,
    rightInputPreview: modalLocalState.rightInputPreview,
    resultPreview: modalLocalState.resultPreview,
    isPreviewLoading: modalLocalState.isPreviewLoading,
    activePreviewTab,
    previewInfo: modalLocalState.previewInfo,
    previewRowLimit,
    availableColumns,
    availableColumnsByPort,
    hasIncomingData,
    inputNodeLabelsByPort,
  };

  const modalActions = {
    onClose: closeModal,
    onConfigChange: setConfig,
    onFileChange: onSourceFileChange,
    onSaveConfig: nodeKind === 'source' ? onSaveSourceNodeConfig : onSaveTransformNodeConfig,
    onPreviewRowLimitChange:
      nodeKind === 'source' ? onSourcePreviewRowLimitChange : onTransformPreviewRowLimitChange,
  };

  const previewActions = {
    onApplyPreview,
  };

  const previewCallbacks = {
    onSetExcelSheetNames: setExcelSheetNames,
    onSetSelectedSheetName: setSelectedSheetName,
  };

  return {
    editingNode,
    nodeKind,
    modalState,
    previewState,
    modalActions,
    previewActions,
    previewCallbacks,
    onSheetNameChange: nodeKind === 'source' ? onSourceSheetNameChange : undefined,
    openNodeModal,
    closeModal,
  };
}
