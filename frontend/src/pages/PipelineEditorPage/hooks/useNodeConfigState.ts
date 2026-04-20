import { useCallback, useMemo, useState } from 'react';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../api/types';

export type NodeKind = 'source' | 'transform' | 'sink';
export type PreviewTab = 'input' | 'left_input' | 'right_input' | 'result';

type NodeConfigModalState = {
  editingNodeId: string | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  selectedFile: File | null;
  inputPreview: PreviewResponse | null;
  leftInputPreview: PreviewResponse | null;
  rightInputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
  isPreviewLoading: boolean;
  activePreviewTab: PreviewTab;
  previewInfo?: string;
  modalError?: string;
};

const SOURCE_TYPES = new Set(['source_file', 'source_db']);
const SINK_TYPES = new Set(['export_file']);

const getDefaultModalState = (): NodeConfigModalState => ({
  editingNodeId: null,
  config: {},
  uploadedDatasourceId: '',
  selectedFile: null,
  inputPreview: null,
  leftInputPreview: null,
  rightInputPreview: null,
  resultPreview: null,
  isPreviewLoading: false,
  activePreviewTab: 'input',
  previewInfo: undefined,
  modalError: undefined,
});

export function getNodeKind(operationType: string): NodeKind {
  if (SOURCE_TYPES.has(operationType)) {
    return 'source';
  }
  if (SINK_TYPES.has(operationType)) {
    return 'sink';
  }
  return 'transform';
}

type UseNodeConfigStateParams = {
  nodes: ApiNode[] | undefined;
};

export function useNodeConfigState({ nodes }: UseNodeConfigStateParams) {
  const [modalState, setModalState] = useState<NodeConfigModalState>(getDefaultModalState);

  const {
    editingNodeId,
    config,
    selectedFile,
    uploadedDatasourceId,
    inputPreview,
    leftInputPreview,
    rightInputPreview,
    resultPreview,
    isPreviewLoading,
    activePreviewTab,
    previewInfo,
    modalError,
  } = modalState;

  const setConfig = useCallback((value: NodeConfig) => {
    setModalState((state) => ({ ...state, config: value }));
  }, []);

  const setSelectedFile = useCallback((value: File | null) => {
    setModalState((state) => ({ ...state, selectedFile: value }));
  }, []);

  const setUploadedDatasourceId = useCallback((value: string) => {
    setModalState((state) => ({ ...state, uploadedDatasourceId: value }));
  }, []);

  const setInputPreview = useCallback((value: PreviewResponse | null) => {
    setModalState((state) => ({ ...state, inputPreview: value }));
  }, []);

  const setLeftInputPreview = useCallback((value: PreviewResponse | null) => {
    setModalState((state) => ({ ...state, leftInputPreview: value }));
  }, []);

  const setRightInputPreview = useCallback((value: PreviewResponse | null) => {
    setModalState((state) => ({ ...state, rightInputPreview: value }));
  }, []);

  const setResultPreview = useCallback((value: PreviewResponse | null) => {
    setModalState((state) => ({ ...state, resultPreview: value }));
  }, []);

  const setIsPreviewLoading = useCallback((value: boolean) => {
    setModalState((state) => ({ ...state, isPreviewLoading: value }));
  }, []);

  const setActivePreviewTab = useCallback((value: PreviewTab) => {
    setModalState((state) => ({ ...state, activePreviewTab: value }));
  }, []);

  const setPreviewInfo = useCallback((value?: string) => {
    setModalState((state) => ({ ...state, previewInfo: value }));
  }, []);

  const setModalError = useCallback((value?: string) => {
    setModalState((state) => ({ ...state, modalError: value }));
  }, []);

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

  const openNodeModalState = useCallback((node: ApiNode) => {
    const cfg = node.config ?? {};
    const currentDatasourceId = typeof cfg.datasource_id === 'string' ? cfg.datasource_id : '';

    setModalState({
      ...getDefaultModalState(),
      editingNodeId: node.id,
      config: { ...cfg },
      uploadedDatasourceId: currentDatasourceId,
    });
  }, []);

  const closeNodeModalState = useCallback(() => {
    setModalState(getDefaultModalState());
  }, []);

  return {
    editingNode,
    nodeKind,
    config,
    modalError,
    inputPreview,
    leftInputPreview,
    rightInputPreview,
    resultPreview,
    isPreviewLoading,
    activePreviewTab,
    previewInfo,
    selectedFile,
    uploadedDatasourceId,
    setConfig,
    setSelectedFile,
    setUploadedDatasourceId,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setActivePreviewTab,
    setPreviewInfo,
    setModalError,
    openNodeModalState,
    closeNodeModalState,
  };
}
