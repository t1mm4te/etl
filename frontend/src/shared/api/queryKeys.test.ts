import { describe, expect, it } from 'vitest';
import { authMeKey, operationsCatalogKey, pipelineDetailKey, pipelineRunKey, pipelinesListKey } from './queryKeys';

describe('queryKeys', () => {
  it('builds stable query keys', () => {
    expect(authMeKey).toEqual(['auth', 'me']);
    expect(pipelinesListKey).toEqual(['pipelines']);
    expect(pipelineDetailKey('pipe-1')).toEqual(['pipeline-detail', 'pipe-1']);
    expect(operationsCatalogKey).toEqual(['operations-catalog']);
    expect(pipelineRunKey('run-1')).toEqual(['pipeline-run', 'run-1']);
    expect(pipelineRunKey(null)).toEqual(['pipeline-run', null]);
  });
});