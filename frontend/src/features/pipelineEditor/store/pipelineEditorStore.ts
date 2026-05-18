import { create } from 'zustand';
import type { ReactFlowInstance } from 'reactflow';

type PipelineEditorStore = {
  resetEditorState: () => void;
  runId: string | null;
  setRunId: (runId: string | null) => void;

  canvasError?: string;
  flowInstance: ReactFlowInstance | null;
  openCategories: Record<string, boolean>;
  setCanvasError: (value?: string) => void;
  setFlowInstance: (instance: ReactFlowInstance | null) => void;
  toggleCategory: (categoryId: string, defaultCategoryId?: string) => void;
};

const getDefaultState = () => ({
  runId: null as string | null,
  canvasError: undefined as string | undefined,
  flowInstance: null as ReactFlowInstance | null,
  openCategories: {} as Record<string, boolean>,
});

export const usePipelineEditorStore = create<PipelineEditorStore>((set) => ({
  ...getDefaultState(),

  resetEditorState: () => set(getDefaultState()),

  setRunId: (runId) => set({ runId }),
  setCanvasError: (canvasError) => set({ canvasError }),
  setFlowInstance: (flowInstance) => set({ flowInstance }),
  toggleCategory: (categoryId, defaultCategoryId) =>
    set((state) => ({
      openCategories: {
        ...state.openCategories,
        [categoryId]: !(state.openCategories[categoryId] ?? defaultCategoryId === categoryId),
      },
    })),
}));
