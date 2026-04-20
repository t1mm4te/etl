import { useCallback } from 'react';
import type { Edge, Node as ApiNode, NodeConfig, NodeRun } from '../../../api/types';
import { usePipelineEditorStore } from '../../../store/pipelineEditorStore';
import { getNodeKind, useNodeConfigState } from './useNodeConfigState';
import { useNodeColumns } from './useNodeColumns';
import { useSourceNodePreviewActions } from './useSourceNodePreviewActions';
import { useTransformNodePreviewActions } from './useTransformNodePreviewActions';

type UseNodeConfigModalStateParams = {
  pipelineId: string;
  nodes: ApiNode[] | undefined;
  edges: Edge[] | undefined;
  nodeRuns: NodeRun[] | undefined;
  saveNodeConfig: (nodeId: string, config: NodeConfig) => Promise<void>;
};

export function useNodeConfigModalState({
  pipelineId,
  nodes,
  edges,
  nodeRuns,
  saveNodeConfig,
}: UseNodeConfigModalStateParams) {
  const setRunId = usePipelineEditorStore((state) => state.setRunId);

  const {
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
  } = useNodeConfigState({ nodes });

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
    closeNodeModalState();
  }, [closeNodeModalState, resetAvailableColumns]);

  const {
    fetchSourcePreview,
    onSaveNodeConfig: onSaveSourceNodeConfig,
    onFileChange: onSourceFileChange,
  } = useSourceNodePreviewActions({
    editingNode,
    config,
    uploadedDatasourceId,
    saveNodeConfig,
    setConfig,
    setSelectedFile,
    setUploadedDatasourceId,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setPreviewInfo,
    setModalError,
    loadAvailableColumns,
    closeModal,
  });

  const {
    resolveNodeRunsForPreview,
    fetchNodePreviewsFromRuns,
    onSaveNodeConfig: onSaveTransformNodeConfig,
    onApplyPreview,
  } = useTransformNodePreviewActions({
    pipelineId,
    nodeRuns,
    nodes,
    edges,
    editingNode,
    nodeKind,
    config,
    uploadedDatasourceId,
    saveNodeConfig,
    setRunId,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setActivePreviewTab,
    setPreviewInfo,
    setModalError,
  });

  const openNodeModal = useCallback(
    async (nodeId: string) => {
      const node = nodes?.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      openNodeModalState(node);
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
      openNodeModalState,
      resolveNodeRunsForPreview,
    ]
  );

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
    onSaveNodeConfig: nodeKind === 'source' ? onSaveSourceNodeConfig : onSaveTransformNodeConfig,
    openNodeModal,
    closeModal,
    setConfig,
    setActivePreviewTab,
    setSelectedFile,
    onSourceFileChange,
  };
}
