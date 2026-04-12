import { apiClient } from './client';
import type {
  DataSourceDetail,
  Edge,
  EdgeCreatePayload,
  Node,
  NodeCreatePayload,
  NodeUpdatePayload,
  OperationCatalogResponse,
  PaginatedResponse,
  PipelineCreatePayload,
  PipelineDetail,
  PipelineListItem,
  PipelineRun,
  PipelineRunDetail,
  PreviewResponse,
} from './types';

export const listPipelines = async () => {
  const response = await apiClient.get<PaginatedResponse<PipelineListItem>>('/pipelines/');
  return response.data;
};

export const createPipeline = async (payload: PipelineCreatePayload) => {
  const response = await apiClient.post('/pipelines/', payload);
  return response.data as { id: string; name: string; description: string };
};

export const deletePipeline = async (pipelineId: string) => {
  await apiClient.delete(`/pipelines/${pipelineId}/`);
};

export const getPipelineDetail = async (pipelineId: string) => {
  const response = await apiClient.get<PipelineDetail>(`/pipelines/${pipelineId}/`);
  return response.data;
};

export const runPipeline = async (pipelineId: string) => {
  const response = await apiClient.post<PipelineRun>(`/pipelines/${pipelineId}/run/`);
  return response.data;
};

export const listPipelineRuns = async (pipelineId: string) => {
  const response = await apiClient.get<PipelineRun[]>(`/pipelines/${pipelineId}/runs/`);
  return response.data;
};

export const getPipelineRun = async (pipelineRunId: string) => {
  const response = await apiClient.get<PipelineRunDetail>(`/pipeline-runs/${pipelineRunId}/`);
  return response.data;
};

export const getOperationsCatalog = async () => {
  const response = await apiClient.get<OperationCatalogResponse>('/operations/');
  return response.data;
};

export const createNode = async (pipelineId: string, payload: NodeCreatePayload) => {
  const response = await apiClient.post<Node>(`/pipelines/${pipelineId}/nodes/`, payload);
  return response.data;
};

export const patchNode = async (pipelineId: string, nodeId: string, payload: NodeUpdatePayload) => {
  const response = await apiClient.patch<Node>(
    `/pipelines/${pipelineId}/nodes/${nodeId}/`,
    payload
  );
  return response.data;
};

export const deleteNode = async (pipelineId: string, nodeId: string) => {
  await apiClient.delete(`/pipelines/${pipelineId}/nodes/${nodeId}/`);
};

export const createEdge = async (pipelineId: string, payload: EdgeCreatePayload) => {
  const response = await apiClient.post<Edge>(`/pipelines/${pipelineId}/edges/`, payload);
  return response.data;
};

export const deleteEdge = async (pipelineId: string, edgeId: string) => {
  await apiClient.delete(`/pipelines/${pipelineId}/edges/${edgeId}/`);
};

export const uploadDatasource = async (file: File, name?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) {
    formData.append('name', name);
  }

  const response = await apiClient.post<DataSourceDetail>('/datasources/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getDatasourceDetail = async (datasourceId: string) => {
  const response = await apiClient.get<DataSourceDetail>(`/datasources/${datasourceId}/`);
  return response.data;
};

export const previewDatasource = async (datasourceId: string, limit = 10) => {
  const response = await apiClient.get<PreviewResponse>(`/datasources/${datasourceId}/preview/`, {
    params: { limit },
  });
  return response.data;
};

export const previewNodeRun = async (nodeRunId: string, limit = 10) => {
  const response = await apiClient.get<PreviewResponse>(`/node-runs/${nodeRunId}/preview/`, {
    params: { limit },
  });
  return response.data;
};
