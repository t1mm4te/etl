import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from 'reactflow';
import { useNavigate, useParams } from 'react-router-dom';
import { PipelineOperationNode } from '../../components/PipelineOperationNode';
import { EditorToolbar } from '../../components/PipelineEditor/EditorToolbar';
import { NodeConfigModal } from '../../components/PipelineEditor/NodeConfigModal';
import { OperationsSidebar } from '../../components/PipelineEditor/OperationsSidebar';
import { RunResultsCard } from '../../components/PipelineEditor/RunResultsCard';
import { usePipelineEditorStore } from '../../store/pipelineEditorStore';
import { usePipelineCanvasState } from './hooks/usePipelineCanvasState';
import { usePipelineEditorMutations } from './hooks/usePipelineEditorMutations';
import { usePipelineEditorQueries } from './hooks/usePipelineEditorQueries';
import { useNodeConfigModalState } from './hooks/useNodeConfigModalState';
import styles from './index.module.scss';
import 'reactflow/dist/style.css';

const NODE_TYPES = {
  operation: PipelineOperationNode,
};

export function PipelineEditorPage() {
  const { pipelineId = '' } = useParams();
  const navigate = useNavigate();
  const resetEditorState = usePipelineEditorStore((state) => state.resetEditorState);
  const { pipelineQuery, operationsQuery, runQuery, operationMetaByType, sortedCategories } =
    usePipelineEditorQueries(pipelineId);

  const {
    createNodeMutation,
    createEdgeMutation,
    patchNodePosition,
    runPipelineMutation,
    saveNodeConfig,
  } = usePipelineEditorMutations({
    pipelineId,
  });

  const {
    canvasRef,
    canvasError,
    edges,
    flowInstance,
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
    onRefreshSourcePreview,
    onSaveNodeConfig,
    onUploadFile,
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
    setConfig,
    setActivePreviewTab,
    setSelectedFile,
  } = useNodeConfigModalState({
    pipelineId,
    nodes: pipelineQuery.data?.nodes,
    edges: pipelineQuery.data?.edges,
    nodeRuns: runQuery.data?.node_runs,
    saveNodeConfig,
  });

  useEffect(() => {
    resetEditorState();
  }, [pipelineId, resetEditorState]);

  useEffect(() => {
    const createdNode = createNodeMutation.data;
    if (!createdNode || !flowInstance) {
      return;
    }

    flowInstance.setCenter(createdNode.position_x, createdNode.position_y, {
      duration: 350,
      zoom: Math.max(flowInstance.getZoom(), 1),
    });
  }, [createNodeMutation.data, flowInstance]);

  return (
    <main className={styles.page}>
      <EditorToolbar
        isPipelineLoaded={Boolean(pipelineQuery.data)}
        isRunPending={runPipelineMutation.isPending}
        onBack={() => navigate('/pipelines')}
        onRun={() => {
          void runPipelineMutation.mutateAsync();
        }}
        pipelineName={pipelineQuery.data?.name}
        runStatus={runQuery.data?.status}
      />

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

      <RunResultsCard nodeRuns={runQuery.data?.node_runs ?? []} />

      {editingNode ? (
        <NodeConfigModal
          activePreviewTab={activePreviewTab}
          config={config}
          availableColumns={availableColumns}
          availableColumnsByPort={availableColumnsByPort}
          hasIncomingData={hasIncomingData}
          inputPreview={inputPreview}
          leftInputPreview={leftInputPreview}
          rightInputPreview={rightInputPreview}
          inputNodeLabelsByPort={inputNodeLabelsByPort}
          isPreviewLoading={isPreviewLoading}
          modalError={modalError}
          node={editingNode}
          nodeKind={nodeKind}
          onActivePreviewTabChange={setActivePreviewTab}
          onApplyPreview={() => {
            void onApplyPreview();
          }}
          onClose={closeModal}
          onConfigChange={setConfig}
          onRefreshSourcePreview={() => {
            void onRefreshSourcePreview();
          }}
          onFileChange={setSelectedFile}
          onSaveConfig={() => {
            void onSaveNodeConfig();
          }}
          onUploadFile={() => {
            void onUploadFile();
          }}
          resultPreview={resultPreview}
          previewInfo={previewInfo}
          selectedFile={selectedFile}
        />
      ) : null}
    </main>
  );
}
