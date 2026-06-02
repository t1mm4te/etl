import { describe, expect, it, vi, beforeEach } from 'vitest';

const apiClientMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({
  apiClient: apiClientMock,
}));

import {
  connectDatasourceDb,
  createDatasourceFromSheet,
  createEdge,
  createNode,
  createPipeline,
  deleteEdge,
  deleteNode,
  deletePipeline,
  getDatasourceDetail,
  getNodeInputColumns,
  getOperationsCatalog,
  getPipelineDetail,
  getPipelineRun,
  getSourceFileDetail,
  listDatasources,
  listPipelineRuns,
  listPipelines,
  listSourceFiles,
  patchNode,
  patchPipeline,
  previewDatasource,
  previewNodeRun,
  runPipeline,
  runPipelinePreview,
  uploadDatasource,
  uploadSourceFile,
} from './pipelines';

describe('pipelines api', () => {
  beforeEach(() => {
    apiClientMock.post.mockReset();
    apiClientMock.get.mockReset();
    apiClientMock.patch.mockReset();
    apiClientMock.delete.mockReset();
  });

  it('calls pipeline and datasource endpoints with expected payloads', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: { results: [] } });
    await expect(listPipelines()).resolves.toEqual({ results: [] });
    expect(apiClientMock.get).toHaveBeenCalledWith('/pipelines/');

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'pipe-1' } });
    await expect(createPipeline({ name: 'Demo', description: 'Test' })).resolves.toEqual({
      id: 'pipe-1',
    });
    expect(apiClientMock.post).toHaveBeenCalledWith('/pipelines/', {
      name: 'Demo',
      description: 'Test',
    });

    apiClientMock.delete.mockResolvedValueOnce({});
    await expect(deletePipeline('pipe-1')).resolves.toBeUndefined();
    expect(apiClientMock.delete).toHaveBeenCalledWith('/pipelines/pipe-1/');

    apiClientMock.patch.mockResolvedValueOnce({ data: { id: 'pipe-1' } });
    await expect(patchPipeline('pipe-1', { name: 'Updated' })).resolves.toEqual({ id: 'pipe-1' });
    expect(apiClientMock.patch).toHaveBeenCalledWith('/pipelines/pipe-1/', { name: 'Updated' });

    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'pipe-1' } });
    await expect(getPipelineDetail('pipe-1')).resolves.toEqual({ id: 'pipe-1' });

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'run-1' } });
    await expect(runPipeline('pipe-1')).resolves.toEqual({ id: 'run-1' });
    expect(apiClientMock.post).toHaveBeenCalledWith('/pipelines/pipe-1/run/');

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'run-2' } });
    await expect(runPipelinePreview('pipe-1', 'node-1')).resolves.toEqual({ id: 'run-2' });
    expect(apiClientMock.post).toHaveBeenCalledWith('/pipelines/pipe-1/nodes/node-1/preview-run/');

    apiClientMock.get.mockResolvedValueOnce({ data: [{ id: 'run-1' }] });
    await expect(listPipelineRuns('pipe-1')).resolves.toEqual([{ id: 'run-1' }]);
    expect(apiClientMock.get).toHaveBeenCalledWith('/pipelines/pipe-1/runs/');

    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'run-1' } });
    await expect(getPipelineRun('run-1')).resolves.toEqual({ id: 'run-1' });
    expect(apiClientMock.get).toHaveBeenCalledWith('/pipeline-runs/run-1/');

    apiClientMock.get.mockResolvedValueOnce({ data: { operations: [] } });
    await expect(getOperationsCatalog()).resolves.toEqual({ operations: [] });
    expect(apiClientMock.get).toHaveBeenCalledWith('/operations/');

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'node-1' } });
    await expect(
      createNode('pipe-1', {
        operation_type: 'source_file',
        label: 'Source',
        config: {},
        position_x: 10,
        position_y: 20,
      })
    ).resolves.toEqual({ id: 'node-1' });
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/pipelines/pipe-1/nodes/',
      expect.objectContaining({ label: 'Source' })
    );

    apiClientMock.patch.mockResolvedValueOnce({ data: { id: 'node-1' } });
    await expect(patchNode('pipe-1', 'node-1', { label: 'Updated' })).resolves.toEqual({
      id: 'node-1',
    });
    expect(apiClientMock.patch).toHaveBeenCalledWith('/pipelines/pipe-1/nodes/node-1/', {
      label: 'Updated',
    });

    apiClientMock.delete.mockResolvedValueOnce({});
    await expect(deleteNode('pipe-1', 'node-1')).resolves.toBeUndefined();
    expect(apiClientMock.delete).toHaveBeenCalledWith('/pipelines/pipe-1/nodes/node-1/');

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'edge-1' } });
    await expect(
      createEdge('pipe-1', {
        source_node: 'a',
        target_node: 'b',
        source_port: 'output',
        target_port: 'input',
      })
    ).resolves.toEqual({ id: 'edge-1' });
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/pipelines/pipe-1/edges/',
      expect.objectContaining({ source_node: 'a' })
    );

    apiClientMock.delete.mockResolvedValueOnce({});
    await expect(deleteEdge('pipe-1', 'edge-1')).resolves.toBeUndefined();
    expect(apiClientMock.delete).toHaveBeenCalledWith('/pipelines/pipe-1/edges/edge-1/');

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'source-1' } });
    const uploadFile = new File(['hello'], 'sample.csv', { type: 'text/csv' });
    await expect(uploadDatasource(uploadFile, 'Sample', 'Sheet1')).resolves.toEqual({
      id: 'source-1',
    });
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/datasources/upload/',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    );

    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'source-1' } });
    await expect(getDatasourceDetail('source-1')).resolves.toEqual({ id: 'source-1' });
    expect(apiClientMock.get).toHaveBeenCalledWith('/datasources/source-1/');

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'source-2' } });
    await expect(
      connectDatasourceDb({
        name: 'DB source',
        db_engine: 'postgresql',
        db_host: 'localhost',
        db_port: 5432,
        db_name: 'etl',
        db_user: 'user',
        db_password: 'pass',
        db_table: 'items',
      })
    ).resolves.toEqual({ id: 'source-2' });
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/datasources/connect-db/',
      expect.objectContaining({ db_table: 'items' }),
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );

    apiClientMock.get.mockResolvedValueOnce({ data: { columns: {} } });
    await expect(previewDatasource('source-1', 5)).resolves.toEqual({ columns: {} });
    expect(apiClientMock.get).toHaveBeenCalledWith('/datasources/source-1/preview/', {
      params: { limit: 5 },
    });

    apiClientMock.get.mockResolvedValueOnce({ data: { columns: {} } });
    await expect(previewNodeRun('node-run-1', 10)).resolves.toEqual({ columns: {} });
    expect(apiClientMock.get).toHaveBeenCalledWith('/node-runs/node-run-1/preview/', {
      params: { limit: 10 },
    });

    apiClientMock.get.mockResolvedValueOnce({ data: { columns: {} } });
    await expect(getNodeInputColumns('pipe-1', 'node-1')).resolves.toEqual({ columns: {} });
    expect(apiClientMock.get).toHaveBeenCalledWith('/pipelines/pipe-1/nodes/node-1/input-columns/');

    apiClientMock.get.mockResolvedValueOnce({ data: { results: [] } });
    await expect(listSourceFiles(10, 20)).resolves.toEqual({ results: [] });
    expect(apiClientMock.get).toHaveBeenCalledWith('/files/', {
      params: { limit: 10, offset: 20 },
    });

    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'file-1' } });
    await expect(getSourceFileDetail('file-1')).resolves.toEqual({ id: 'file-1' });
    expect(apiClientMock.get).toHaveBeenCalledWith('/files/file-1/');

    apiClientMock.get.mockResolvedValueOnce({ data: { results: [] } });
    await expect(listDatasources('file-1')).resolves.toEqual({ results: [] });
    expect(apiClientMock.get).toHaveBeenCalledWith('/datasources/', {
      params: { source_file_id: 'file-1' },
    });

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'source-3' } });
    const sourceFile = new File(['hello'], 'sample.csv', { type: 'text/csv' });
    await expect(
      uploadSourceFile(sourceFile, 'Sample', {
        onUploadProgress: vi.fn(),
      })
    ).resolves.toEqual({ id: 'source-3' });
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/files/',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: expect.any(Function),
      })
    );

    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'source-4' } });
    await expect(createDatasourceFromSheet('source-file-1', 'Sheet1')).resolves.toEqual({
      id: 'source-4',
    });
    expect(apiClientMock.post).toHaveBeenCalledWith('/datasources/', {
      source_file_id: 'source-file-1',
      sheet_name: 'Sheet1',
    });
  });
});
