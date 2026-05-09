export const authMeKey = ['auth', 'me'] as const;

export const pipelinesListKey = ['pipelines'] as const;

export const pipelineDetailKey = (pipelineId: string) => ['pipeline-detail', pipelineId] as const;

export const operationsCatalogKey = ['operations-catalog'] as const;

export const pipelineRunKey = (runId: string | null | undefined) =>
  ['pipeline-run', runId] as const;
