import type { MouseEvent as ReactMouseEvent } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from 'reactflow';
import { PipelineOperationNode } from '../../../components/PipelineOperationNode';
import { usePipelineCanvasState } from '../hooks/usePipelineCanvasState';
import { usePipelineEditorMutations } from '../hooks/usePipelineEditorMutations';
import { usePipelineEditorQueries } from '../hooks/usePipelineEditorQueries';
import { usePipelineEditorStore } from '../../../store/pipelineEditorStore';
import { useNodeConfigModalStore } from '../../../store/nodeConfigModalStore';
import styles from '../index.module.scss';
import 'reactflow/dist/style.css';

const NODE_TYPES = {
  operation: PipelineOperationNode,
};

type PipelineCanvasSectionProps = {
  pipelineId: string;
};

export function PipelineCanvasSection({ pipelineId }: PipelineCanvasSectionProps) {
  const { pipelineQuery, operationMetaByType, sortedCategories } =
    usePipelineEditorQueries(pipelineId);
  const { createEdgeMutation, patchNodePosition } = usePipelineEditorMutations({ pipelineId });

  const canvasError = usePipelineEditorStore((state) => state.canvasError);
  const openNodeModalState = useNodeConfigModalStore((state) => state.openNodeModalState);

  const {
    canvasRef,
    edges,
    nodes,
    onConnect,
    onDeleteEdges,
    onDeleteNodes,
    onEdgesChange,
    onNodeDragStop,
    onNodesChange,
    setFlowInstance,
  } = usePipelineCanvasState({
    pipelineId,
    pipeline: pipelineQuery.data,
    operationMetaByType,
    sortedCategories,
    createEdgeAsync: async (connection) => createEdgeMutation.mutateAsync({ connection }),
    patchNodePosition,
  });

  const handleNodeDoubleClick = (_event: ReactMouseEvent, node: { id: string }) => {
    const selectedNode = pipelineQuery.data?.nodes.find((item) => item.id === node.id);
    if (!selectedNode) {
      return;
    }
    openNodeModalState(selectedNode);
  };

  return (
    <>
      {canvasError ? <p className={styles.error}>{canvasError}</p> : null}
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
          onNodeDoubleClick={handleNodeDoubleClick}
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
    </>
  );
}
