import { useEffect, useRef } from 'react';
import { NodeConfigModal } from '../../../components/PipelineEditor/NodeConfigModal';
import { useNodeConfigModalState } from '../hooks/useNodeConfigModalState';
import { usePipelineEditorQueries } from '../hooks/usePipelineEditorQueries';
import { usePipelineEditorMutations } from '../hooks/usePipelineEditorMutations';

type NodeConfigModalSectionProps = {
  pipelineId: string;
};

export function NodeConfigModalSection({ pipelineId }: NodeConfigModalSectionProps) {
  const { pipelineQuery, runQuery } = usePipelineEditorQueries(pipelineId);
  const { saveNodeConfig } = usePipelineEditorMutations({ pipelineId });

  const {
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
    selectedFileName,
    selectedSheetName,
    excelSheetNames,
    previewRowLimit,
    onApplyPreview,
    onSaveNodeConfig,
    onPreviewRowLimitChange,
    onSheetNameChange,
    openNodeModal,
    closeModal,
    setConfig,
    setActivePreviewTab,
    setSelectedSheetName,
    setExcelSheetNames,
    setPreviewRowLimit,
    onSourceFileChange,
  } = useNodeConfigModalState({
    pipelineId,
    nodes: pipelineQuery.data?.nodes,
    edges: pipelineQuery.data?.edges,
    nodeRuns: runQuery.data?.node_runs,
    saveNodeConfig,
  });

  const initializedNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editingNode) {
      initializedNodeIdRef.current = null;
      return;
    }

    if (initializedNodeIdRef.current === editingNode.id) {
      return;
    }

    initializedNodeIdRef.current = editingNode.id;
    void openNodeModal(editingNode.id);
  }, [editingNode?.id, openNodeModal, editingNode]);

  if (!editingNode) {
    return null;
  }

  return (
    <NodeConfigModal
      modalState={{
        node: editingNode,
        nodeKind,
        hasIncomingData,
        config,
        selectedFile,
        selectedFileName,
        selectedSheetName,
        excelSheetNames,
        previewRowLimit,
        availableColumns,
        availableColumnsByPort,
        inputNodeLabelsByPort,
        previewInfo,
        modalError,
      }}
      previewState={{
        inputPreview,
        leftInputPreview,
        rightInputPreview,
        resultPreview,
        isPreviewLoading,
        activePreviewTab,
      }}
      modalActions={{
        onClose: closeModal,
        onConfigChange: setConfig,
        onFileChange: onSourceFileChange,
        onSaveConfig: () => {
          void onSaveNodeConfig();
        },
      }}
      previewActions={{
        onActivePreviewTabChange: setActivePreviewTab,
        onApplyPreview: () => {
          void onApplyPreview();
        },
      }}
      previewCallbacks={{
        onSetExcelSheetNames: setExcelSheetNames,
        onSetSelectedSheetName: setSelectedSheetName,
        onSetPreviewRowLimit: setPreviewRowLimit,
      }}
      onSheetNameChange={onSheetNameChange}
      onPreviewRowLimitChange={onPreviewRowLimitChange}
    />
  );
}
