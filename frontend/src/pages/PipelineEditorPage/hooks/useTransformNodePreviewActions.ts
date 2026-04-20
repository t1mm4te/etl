import { useCallback } from 'react';
import {
  getDatasourceDetail,
  getPipelineRun,
  listPipelineRuns,
  previewDatasource,
  previewNodeRun,
  runPipelinePreview,
} from '../../../api/pipelines';
import type {
  Edge,
  Node as ApiNode,
  NodeConfig,
  NodeRun,
  PreviewResponse,
} from '../../../api/types';
import { extractError } from '../../../lib/extractError';
import type { NodeKind, PreviewTab } from './useNodeConfigState';
import { buildNextNodeConfig } from './nodePreviewUtils';
import { getNodeKind } from './useNodeConfigState';

type UseTransformNodePreviewActionsParams = {
  pipelineId: string;
  nodeRuns: NodeRun[] | undefined;
  nodes: ApiNode[] | undefined;
  edges: Edge[] | undefined;
  editingNode: ApiNode | null;
  nodeKind: NodeKind;
  config: NodeConfig;
  uploadedDatasourceId: string;
  saveNodeConfig: (nodeId: string, config: NodeConfig) => Promise<void>;
  setRunId: (runId: string | null) => void;
  setInputPreview: (value: PreviewResponse | null) => void;
  setLeftInputPreview: (value: PreviewResponse | null) => void;
  setRightInputPreview: (value: PreviewResponse | null) => void;
  setResultPreview: (value: PreviewResponse | null) => void;
  setIsPreviewLoading: (value: boolean) => void;
  setActivePreviewTab: (value: PreviewTab) => void;
  setPreviewInfo: (value?: string) => void;
  setModalError: (value?: string) => void;
};

export function useTransformNodePreviewActions({
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
}: UseTransformNodePreviewActionsParams) {
  const clearTransformPreviews = useCallback(() => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
  }, [setInputPreview, setLeftInputPreview, setResultPreview, setRightInputPreview]);

  const getNextConfig = useCallback(
    () => buildNextNodeConfig(config, uploadedDatasourceId),
    [config, uploadedDatasourceId]
  );

  const getSuccessfulNodeRun = useCallback(
    (nodeId: string, runs: NodeRun[] | undefined = nodeRuns) =>
      runs?.find((run) => run.node === nodeId && run.status === 'success') ?? null,
    [nodeRuns]
  );

  const waitForRunCompletion = useCallback(async (runId: string) => {
    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const runDetail = await getPipelineRun(runId);
      if (
        runDetail.status === 'success' ||
        runDetail.status === 'failed' ||
        runDetail.status === 'cancelled'
      ) {
        return runDetail;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
    }

    throw new Error('Не дождались завершения фонового запуска пайплайна для предпросмотра');
  }, []);

  const resolveNodeRunsForPreview = useCallback(async () => {
    if (nodeRuns && nodeRuns.length > 0) {
      return nodeRuns;
    }

    const runs = await listPipelineRuns(pipelineId);
    const latestCompletedRun = runs.find(
      (run) => run.status === 'success' || run.status === 'failed'
    );

    if (!latestCompletedRun) {
      return null;
    }

    setRunId(latestCompletedRun.id);
    const runDetail = await getPipelineRun(latestCompletedRun.id);
    return runDetail.node_runs;
  }, [nodeRuns, pipelineId, setRunId]);

  const fetchNodePreviewsFromRuns = useCallback(
    async (node: ApiNode, runsOverride?: NodeRun[]) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);

      try {
        if (getNodeKind(node.operation_type) !== 'source') {
          const incomingEdges = (edges ?? []).filter((edge) => edge.target_node === node.id);

          if (incomingEdges.length === 0) {
            setInputPreview(null);
            setLeftInputPreview(null);
            setRightInputPreview(null);
          } else {
            const previewsByPort: Record<string, PreviewResponse | null> = {};

            for (const incomingEdge of incomingEdges) {
              let preview = null;
              const upstreamRun = getSuccessfulNodeRun(incomingEdge.source_node, runsOverride);

              if (upstreamRun) {
                preview = await previewNodeRun(upstreamRun.id, 10);
              } else {
                const upstreamNode = nodes?.find((item) => item.id === incomingEdge.source_node);
                const upstreamDatasourceId = upstreamNode?.config?.datasource_id;
                if (typeof upstreamDatasourceId === 'string' && upstreamDatasourceId) {
                  const upstreamDatasource = await getDatasourceDetail(upstreamDatasourceId);
                  if (upstreamDatasource.status === 'ready') {
                    preview = await previewDatasource(upstreamDatasourceId, 10);
                  }
                }
              }

              const port = incomingEdge.target_port || 'main';
              previewsByPort[port] = preview;
            }

            setInputPreview(previewsByPort.main ?? null);
            setLeftInputPreview(previewsByPort.left ?? previewsByPort.main ?? null);
            setRightInputPreview(previewsByPort.right ?? null);
          }
        }

        const ownRun = getSuccessfulNodeRun(node.id, runsOverride);
        if (ownRun) {
          const ownPreview = await previewNodeRun(ownRun.id, 10);
          setResultPreview(ownPreview);
        } else {
          setResultPreview(null);
        }

        if (node.operation_type === 'join') {
          setActivePreviewTab('left_input');
        } else {
          setActivePreviewTab(getNodeKind(node.operation_type) === 'source' ? 'result' : 'input');
        }
      } catch (error) {
        clearTransformPreviews();
        setModalError(
          extractError(error, 'Не удалось получить предпросмотр по последнему запуску')
        );
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      edges,
      getSuccessfulNodeRun,
      nodes,
      setActivePreviewTab,
      setInputPreview,
      setIsPreviewLoading,
      setLeftInputPreview,
      setModalError,
      setPreviewInfo,
      setResultPreview,
      setRightInputPreview,
      clearTransformPreviews,
    ]
  );

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const nextConfig = getNextConfig();
      await saveNodeConfig(editingNode.id, nextConfig);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
    }
  }, [editingNode, getNextConfig, saveNodeConfig, setModalError]);

  const onApplyPreview = useCallback(async () => {
    if (!editingNode || nodeKind === 'source') {
      return;
    }

    setModalError(undefined);
    setPreviewInfo(undefined);
    setIsPreviewLoading(true);

    try {
      const nextConfig = getNextConfig();
      await saveNodeConfig(editingNode.id, nextConfig);

      setPreviewInfo('Конфигурация сохранена. Запускаем локальный предпросмотр для узла...');
      const startedRun = await runPipelinePreview(pipelineId, editingNode.id);
      setRunId(startedRun.id);
      const completedRun = await waitForRunCompletion(startedRun.id);

      if (completedRun.status === 'failed') {
        throw new Error(
          completedRun.error_message || 'Локальный запуск предпросмотра завершился с ошибкой'
        );
      }

      if (completedRun.status === 'cancelled') {
        throw new Error('Локальный запуск предпросмотра был отменен');
      }

      setPreviewInfo('Локальный запуск завершен. Загружаем свежий предпросмотр...');
      await fetchNodePreviewsFromRuns(editingNode, completedRun.node_runs);
      setActivePreviewTab('result');
      setPreviewInfo('Предпросмотр обновлен.');
    } catch (error) {
      setModalError(extractError(error, 'Не удалось применить настройки для предпросмотра'));
      setIsPreviewLoading(false);
    }
  }, [
    editingNode,
    fetchNodePreviewsFromRuns,
    getNextConfig,
    nodeKind,
    pipelineId,
    saveNodeConfig,
    setActivePreviewTab,
    setIsPreviewLoading,
    setModalError,
    setPreviewInfo,
    setRunId,
    waitForRunCompletion,
  ]);

  return {
    resolveNodeRunsForPreview,
    fetchNodePreviewsFromRuns,
    onSaveNodeConfig,
    onApplyPreview,
  };
}
