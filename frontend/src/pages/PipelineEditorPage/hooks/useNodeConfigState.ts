import { useMemo } from 'react';
import type { Node as ApiNode } from '../../../api/types';
import { useNodeConfigModalStore } from '../../../store/nodeConfigModalStore';
export type { PreviewTab } from '../../../store/nodeConfigModalStore';

export type NodeKind = 'source' | 'transform' | 'sink';

const SOURCE_TYPES = new Set(['source_file', 'source_db']);
const SINK_TYPES = new Set(['export_file']);

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
  } = useNodeConfigModalStore((state) => state);

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
