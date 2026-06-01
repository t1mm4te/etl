import { beforeEach, describe, expect, it } from 'vitest';
import { usePipelineEditorStore } from './pipelineEditorStore';

describe('usePipelineEditorStore', () => {
  beforeEach(() => {
    usePipelineEditorStore.getState().resetEditorState();
  });

  it('stores run and canvas state', () => {
    const { setRunId, setCanvasError, setFlowInstance } = usePipelineEditorStore.getState();

    const flowInstance = { id: 'flow' } as never;

    setRunId('run-1');
    setCanvasError('Canvas failed');
    setFlowInstance(flowInstance);

    expect(usePipelineEditorStore.getState().runId).toBe('run-1');
    expect(usePipelineEditorStore.getState().canvasError).toBe('Canvas failed');
    expect(usePipelineEditorStore.getState().flowInstance).toBe(flowInstance);
  });

  it('toggles categories with the default category open by default', () => {
    const { toggleCategory } = usePipelineEditorStore.getState();

    toggleCategory('extract', 'extract');
    expect(usePipelineEditorStore.getState().openCategories.extract).toBe(false);

    toggleCategory('extract', 'extract');
    expect(usePipelineEditorStore.getState().openCategories.extract).toBe(true);

    toggleCategory('rows', 'extract');
    expect(usePipelineEditorStore.getState().openCategories.rows).toBe(true);
  });
});
