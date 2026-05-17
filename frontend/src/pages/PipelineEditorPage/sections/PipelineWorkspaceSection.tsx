import type { MouseEvent as ReactMouseEvent } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from 'reactflow';
import { PipelineOperationNode } from '../../../components/PipelineOperationNode';
import { NodeConfigModal } from '../../../components/PipelineEditor/NodeConfigModal';
import { OperationsSidebar } from '../../../components/PipelineEditor/OperationsSidebar';
import { usePipelineCanvasState } from '../hooks/usePipelineCanvasState';
import { usePipelineEditorMutations } from '../hooks/usePipelineEditorMutations';
import { usePipelineEditorQueries } from '../hooks/usePipelineEditorQueries';
import { useNodeConfigModalState } from '../hooks/useNodeConfigModalState';
import styles from '../index.module.scss';
import 'reactflow/dist/style.css';

const NODE_TYPES = {
  operation: PipelineOperationNode,
};

type PipelineWorkspaceSectionProps = {
  pipelineId: string;
};

export function PipelineWorkspaceSection({ pipelineId }: PipelineWorkspaceSectionProps) {
  const { pipelineQuery, operationsQuery, runQuery, operationMetaByType, sortedCategories } =
    usePipelineEditorQueries(pipelineId);
  const { createNodeMutation, createEdgeMutation, patchNodePosition, saveNodeConfig } =
    usePipelineEditorMutations({ pipelineId });

  const {
    canvasRef,
    canvasError,
    edges,
    getNewNodePosition,
    nodes,
    onConnect,
    onDeleteEdges,
    onDeleteNodes,
    onEdgesChange,
    onNodeDragStop,
    onNodesChange,
    openCategories,
    setFlowInstance,
    toggleCategory,
  } = usePipelineCanvasState({
    pipelineId,
    pipeline: pipelineQuery.data,
    operationMetaByType,
    sortedCategories,
    createEdgeAsync: async (connection) => createEdgeMutation.mutateAsync({ connection }),
    patchNodePosition,
  });

  const {
    editingNode,
    nodeKind,
    hasIncomingData,
    config,
    modalError,
    onApplyPreview,
    onSaveNodeConfig,
    openNodeModal,
    closeModal,
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
    setConfig,
    setActivePreviewTab,
    setSelectedSheetName,
    setExcelSheetNames,
    setPreviewRowLimit,
    onSourceFileChange,
    onPreviewRowLimitChange,
    onSheetNameChange,
  } = useNodeConfigModalState({
    pipelineId,
    nodes: pipelineQuery.data?.nodes,
    edges: pipelineQuery.data?.edges,
    nodeRuns: runQuery.data?.node_runs,
    saveNodeConfig,
  });

  return (
    <>
      {canvasError ? <p className={styles.error}>{canvasError}</p> : null}

      <section className={styles.layout}>
        <OperationsSidebar
          isLoading={operationsQuery.isLoading}
          onCreateNode={(operation) => {
            void createNodeMutation.mutateAsync({
              operation,
              position: getNewNodePosition(),
            });
          }}
          onToggleCategory={toggleCategory}
          openCategories={openCategories}
          operations={operationsQuery.data?.operations ?? []}
          sortedCategories={sortedCategories}
        />

        <div className={styles.canvas} ref={canvasRef}>
          {pipelineQuery.isLoading ? <p className={styles.muted}>Загружаем пайплайн...</p> : null}

          <ReactFlow
            edges={edges}
            nodes={nodes}
            nodeTypes={NODE_TYPES}
            onInit={setFlowInstance}
            onConnect={(connection) => {
              void onConnect(connection);
            }}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={(items) => {
              void onDeleteEdges(items);
            }}
            onNodesDelete={(items) => {
              void onDeleteNodes(items);
            }}
            onNodeDoubleClick={(_event: ReactMouseEvent, node) => {
              void openNodeModal(node.id);
            }}
            onNodeDragStop={(_event: ReactMouseEvent, node) => {
              void onNodeDragStop(_event, node);
            }}
            onNodesChange={onNodesChange}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </section>

      {editingNode ? (
        <NodeConfigModal
          modalActions={{
            onClose: closeModal,
            onConfigChange: setConfig,
            onFileChange: onSourceFileChange,
            onSaveConfig: () => {
              void onSaveNodeConfig();
            },
          }}
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
          previewActions={{
            onActivePreviewTabChange: setActivePreviewTab,
            onApplyPreview: () => {
              void onApplyPreview();
            },
          }}
          previewState={{
            inputPreview,
            leftInputPreview,
            rightInputPreview,
            resultPreview,
            isPreviewLoading,
            activePreviewTab,
          }}
          previewCallbacks={{
            onSetExcelSheetNames: setExcelSheetNames,
            onSetSelectedSheetName: onSheetNameChange ?? setSelectedSheetName,
            onSetPreviewRowLimit: setPreviewRowLimit,
          }}
          onSheetNameChange={onSheetNameChange}
          onPreviewRowLimitChange={onPreviewRowLimitChange}
        />
      ) : null}
    </>
  );
}
