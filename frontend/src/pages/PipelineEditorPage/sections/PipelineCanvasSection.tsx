import type { MouseEvent as ReactMouseEvent } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from 'reactflow';
import { PipelineOperationNode } from '../../../features/pipelineEditor/components/PipelineOperationNode';
import { usePipelineCanvasState } from '../../../features/pipelineEditor/hooks/usePipelineCanvasState';
import { usePipelineEditorMutations } from '../../../features/pipelineEditor/hooks/usePipelineEditorMutations';
import { usePipelineEditorQueries } from '../../../features/pipelineEditor/hooks/usePipelineEditorQueries';
import { usePipelineEditorStore } from '../../../features/pipelineEditor/store/pipelineEditorStore';
import styles from '../index.module.scss';
import 'reactflow/dist/style.css';

const NODE_TYPES = {
  operation: PipelineOperationNode,
};

type PipelineCanvasSectionProps = {
  pipelineId: string;
  onOpenNodeConfig: (nodeId: string) => void;
};

export function PipelineCanvasSection({
  pipelineId,
  onOpenNodeConfig,
}: PipelineCanvasSectionProps) {
  const { pipelineQuery, operationMetaByType, sortedCategories } =
    usePipelineEditorQueries(pipelineId);
  const { createEdgeMutation, patchNodePosition } = usePipelineEditorMutations({ pipelineId });

  const canvasError = usePipelineEditorStore((state) => state.canvasError);

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
    onOpenNodeConfig(selectedNode.id);
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
