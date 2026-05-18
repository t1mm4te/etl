import { useEffect, useRef } from 'react';
import { NodeConfigModal } from '../../../components/PipelineEditor/NodeConfigModal';
import { useNodeConfigModalState } from '../hooks/useNodeConfigModalState';
import { usePipelineEditorQueries } from '../hooks/usePipelineEditorQueries';
import { usePipelineEditorMutations } from '../hooks/usePipelineEditorMutations';

type NodeConfigModalSectionProps = {
  pipelineId: string;
  editingNodeId: string | null;
  onClose: () => void;
};

export function NodeConfigModalSection({
  pipelineId,
  editingNodeId,
  onClose,
}: NodeConfigModalSectionProps) {
  const { pipelineQuery, runQuery } = usePipelineEditorQueries(pipelineId);
  const { saveNodeConfig } = usePipelineEditorMutations({ pipelineId });

  const {
    editingNode,
    modalState,
    previewState,
    modalActions,
    previewActions,
    previewCallbacks,
    openNodeModal,
    onSheetNameChange,
  } = useNodeConfigModalState({
    pipelineId,
    editingNodeId,
    onClose,
    nodes: pipelineQuery.data?.nodes,
    edges: pipelineQuery.data?.edges,
    nodeRuns: runQuery.data?.node_runs,
    saveNodeConfig,
  });

  const initializedNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editingNodeId) {
      initializedNodeIdRef.current = null;
      return;
    }

    if (initializedNodeIdRef.current === editingNodeId) {
      return;
    }

    initializedNodeIdRef.current = editingNodeId;
    void openNodeModal(editingNodeId);
  }, [editingNodeId, openNodeModal]);

  if (!editingNode) {
    return null;
  }

  return (
    <NodeConfigModal
      modalState={modalState}
      previewState={previewState}
      modalActions={modalActions}
      previewActions={previewActions}
      previewCallbacks={previewCallbacks}
      onSheetNameChange={onSheetNameChange}
    />
  );
}
