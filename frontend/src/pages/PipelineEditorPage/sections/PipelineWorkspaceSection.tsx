import { OperationsSidebar } from '../../../components/PipelineEditor/OperationsSidebar';
import { PipelineCanvasSection } from './PipelineCanvasSection';
import { NodeConfigModalSection } from './NodeConfigModalSection';
import styles from '../index.module.scss';

type PipelineWorkspaceSectionProps = {
  pipelineId: string;
};

export function PipelineWorkspaceSection({ pipelineId }: PipelineWorkspaceSectionProps) {
  return (
    <section className={styles.layout}>
      <OperationsSidebar pipelineId={pipelineId} />
      <PipelineCanvasSection pipelineId={pipelineId} />
      <NodeConfigModalSection pipelineId={pipelineId} />
    </section>
  );
}
