import {
  getDatasourceDetail,
  getPipelineRun,
  previewDatasource,
  previewNodeRun,
  runPipelinePreview,
} from '../../../shared/api/pipelines';
import type {
  Edge,
  Node as ApiNode,
  NodeRun,
  PreviewResponse,
  NodeConfig,
  PipelineRunDetail,
} from '../../../shared/api/types';
import { extractError } from '../../../shared/lib/extractError';
import { getNodeKind } from '../utils/getNodeKind';

type FetchTransformPreviewParams = {
  node: ApiNode;
  nodes?: ApiNode[];
  edges?: Edge[];
  nodeRuns?: NodeRun[] | null;
  rowLimit?: number;
};

type TransformPreviews = {
  inputPreview: PreviewResponse | null;
  leftInputPreview: PreviewResponse | null;
  rightInputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
};

export async function fetchTransformPreviewFromRuns({
  node,
  nodes,
  edges,
  nodeRuns,
  rowLimit = 15,
}: FetchTransformPreviewParams): Promise<TransformPreviews> {
  try {
    let inputPreview: PreviewResponse | null = null;
    let leftInputPreview: PreviewResponse | null = null;
    let rightInputPreview: PreviewResponse | null = null;
    let resultPreview: PreviewResponse | null = null;

    if (getNodeKind(node.operation_type) !== 'source') {
      const incomingEdges = (edges ?? []).filter((edge) => edge.target_node === node.id);

      if (incomingEdges.length > 0) {
        const previewsByPort: Record<string, PreviewResponse | null> = {};

        for (const incomingEdge of incomingEdges) {
          let preview: PreviewResponse | null = null;
          const upstreamNode = nodes?.find((item) => item.id === incomingEdge.source_node);
          const upstreamDatasourceId = upstreamNode?.config?.datasource_id;

          if (typeof upstreamDatasourceId === 'string' && upstreamDatasourceId) {
            const upstreamDatasource = await getDatasourceDetail(upstreamDatasourceId);
            if (upstreamDatasource.status === 'ready') {
              preview = await previewDatasource(upstreamDatasourceId, rowLimit);
            }
          } else {
            const upstreamRun =
              nodeRuns?.find(
                (run) => run.node === incomingEdge.source_node && run.status === 'success'
              ) ?? null;
            if (upstreamRun) {
              preview = await previewNodeRun(upstreamRun.id, rowLimit);
            }
          }

          const port = incomingEdge.target_port || 'main';
          previewsByPort[port] = preview;
        }

        inputPreview = previewsByPort.main ?? null;
        leftInputPreview = previewsByPort.left ?? previewsByPort.main ?? null;
        rightInputPreview = previewsByPort.right ?? null;
      }
    }

    const ownRun =
      nodeRuns?.find((run) => run.node === node.id && run.status === 'success') ?? null;
    if (ownRun) {
      resultPreview = await previewNodeRun(ownRun.id, rowLimit);
    }

    return { inputPreview, leftInputPreview, rightInputPreview, resultPreview };
  } catch (error) {
    throw new Error(extractError(error, 'Не удалось получить предпросмотр по последнему запуску'));
  }
}

type RunTransformPreviewParams = {
  pipelineId: string;
  editingNode: ApiNode;
  getNextConfig: () => NodeConfig;
  saveNodeConfig: (
    nodeId: string,
    config: NodeConfig,
    options?: { label?: string }
  ) => Promise<void>;
  waitTimeoutMs?: number;
};

type RunTransformPreviewResult = {
  startedRun: { id: string };
  completedRun: PipelineRunDetail;
};

export async function runTransformPreview({
  pipelineId,
  editingNode,
  getNextConfig,
  saveNodeConfig,
  waitTimeoutMs = 1500,
}: RunTransformPreviewParams): Promise<RunTransformPreviewResult> {
  if (!editingNode) {
    throw new Error('No editing node provided');
  }

  try {
    const nextConfig = getNextConfig();
    await saveNodeConfig(editingNode.id, nextConfig);

    const startedRun = await runPipelinePreview(pipelineId, editingNode.id);

    const maxAttempts = 40;
    let completedRun: PipelineRunDetail | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const runDetail = await getPipelineRun(startedRun.id);
      if (
        runDetail.status === 'success' ||
        runDetail.status === 'failed' ||
        runDetail.status === 'cancelled'
      ) {
        completedRun = runDetail;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, waitTimeoutMs));
    }

    if (!completedRun) {
      throw new Error('Не дождались завершения фонового запуска пайплайна для предпросмотра');
    }

    if (completedRun.status === 'failed') {
      throw new Error(
        completedRun.error_message || 'Локальный запуск предпросмотра завершился с ошибкой'
      );
    }

    if (completedRun.status === 'cancelled') {
      throw new Error('Локальный запуск предпросмотра был отменен');
    }

    return { startedRun, completedRun };
  } catch (error) {
    throw new Error(extractError(error, 'Не удалось запустить предпросмотр'));
  }
}
