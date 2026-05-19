import type { AxiosProgressEvent } from 'axios';
import { apiClient } from './client';
import type {
  DataSourceDetail,
  Edge,
  EdgeCreatePayload,
  Node,
  NodeCreatePayload,
  NodeInputColumnsResponse,
  NodeUpdatePayload,
  OperationCatalogResponse,
  PaginatedResponse,
  PipelineCreatePayload,
  PipelineDetail,
  PipelineListItem,
  PipelineRun,
  PipelineRunDetail,
  PipelineUpdatePayload,
  PreviewResponse,
  SourceFile,
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

export const patchPipeline = async (pipelineId: string, payload: PipelineUpdatePayload) => {
  const response = await apiClient.patch(`/pipelines/${pipelineId}/`, payload);
  return response.data as { id: string; name: string; description: string };
};

export const getPipelineDetail = async (pipelineId: string) => {
  const response = await apiClient.get<PipelineDetail>(`/pipelines/${pipelineId}/`);
  return response.data;
};

export const runPipeline = async (pipelineId: string) => {
  const response = await apiClient.post<PipelineRun>(`/pipelines/${pipelineId}/run/`);
  return response.data;
};

export const runPipelinePreview = async (pipelineId: string, nodeId: string) => {
  const response = await apiClient.post<PipelineRun>(
    `/pipelines/${pipelineId}/nodes/${nodeId}/preview-run/`
  );
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

export const uploadDatasource = async (file: File, name?: string, sheetName?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) {
    formData.append('name', name);
  }
  if (sheetName) {
    formData.append('sheet_name', sheetName);
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

export const setDatasourceSheet = async (datasourceId: string, sheetName: string) => {
  const response = await apiClient.put<DataSourceDetail>(
    `/datasources/${datasourceId}/set-sheet/`,
    { sheet_name: sheetName }
  );
  return response.data;
};

export const previewDatasource = async (datasourceId: string, limit?: number) => {
  const response = await apiClient.get<PreviewResponse>(`/datasources/${datasourceId}/preview/`, {
    params: limit ? { limit } : undefined,
  });
  return response.data;
};

export const previewNodeRun = async (nodeRunId: string, limit = 10) => {
  const response = await apiClient.get<PreviewResponse>(`/node-runs/${nodeRunId}/preview/`, {
    params: { limit },
  });
  return response.data;
};

export const getNodeInputColumns = async (pipelineId: string, nodeId: string) => {
  const response = await apiClient.get<NodeInputColumnsResponse>(
    `/pipelines/${pipelineId}/nodes/${nodeId}/input-columns/`
  );
  return response.data;
};

// New API: upload source file (POST /api/files/)
export const uploadSourceFile = async (
  file: File,
  name?: string,
  options?: { onUploadProgress?: (progressEvent: AxiosProgressEvent) => void }
) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const response = await apiClient.post<SourceFile>('/files/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options?.onUploadProgress,
  });

  return response.data;
};

// Create DataSource from an existing SourceFile's sheet
export const createDatasourceFromSheet = async (sourceFileId: string, sheetName: string) => {
  const response = await apiClient.post<DataSourceDetail>('/datasources/', {
    source_file_id: sourceFileId,
    sheet_name: sheetName,
  });
  return response.data;
};

// List source files (GET /api/files/)
export const listSourceFiles = async (limit?: number, offset?: number) => {
  const response = await apiClient.get<PaginatedResponse<SourceFile>>('/files/', {
    params: { limit, offset },
  });
  return response.data;
};

export const getSourceFileDetail = async (fileId: string) => {
  const response = await apiClient.get<SourceFile>(`/files/${fileId}/`);
  return response.data;
};

// List datasources (optionally filter by source_file_id)
export const listDatasources = async (sourceFileId?: string) => {
  const response = await apiClient.get<PaginatedResponse<DataSourceDetail>>('/datasources/', {
    params: sourceFileId ? { source_file_id: sourceFileId } : undefined,
  });
  return response.data;
};
