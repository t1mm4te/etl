import { useState } from 'react';
import { OperationsSidebar } from '../../../components/PipelineEditor/OperationsSidebar';
import { PipelineCanvasSection } from './PipelineCanvasSection';
import { NodeConfigModalSection } from './NodeConfigModalSection';
import styles from '../index.module.scss';

type PipelineWorkspaceSectionProps = {
  pipelineId: string;
};

export function PipelineWorkspaceSection({ pipelineId }: PipelineWorkspaceSectionProps) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  return (
    <section className={styles.layout}>
      <OperationsSidebar pipelineId={pipelineId} />
      <PipelineCanvasSection
        pipelineId={pipelineId}
        onOpenNodeConfig={(nodeId) => {
          setEditingNodeId(nodeId);
        }}
      />
      <NodeConfigModalSection
        key={editingNodeId ?? 'none'}
        pipelineId={pipelineId}
        editingNodeId={editingNodeId}
        onClose={() => {
          setEditingNodeId(null);
        }}
      />
    </section>
  );
}
