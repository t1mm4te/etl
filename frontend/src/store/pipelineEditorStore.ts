import { create } from 'zustand';
import type { ReactFlowInstance } from 'reactflow';
import type { NodeConfig, PreviewResponse } from '../api/types';

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

  editingNodeId: string | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  selectedFile: File | null;
  inputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
  isPreviewLoading: boolean;
  activePreviewTab: 'input' | 'result';
  previewInfo?: string;
  modalError?: string;
  openNodeModal: (nodeId: string, config: NodeConfig, datasourceId: string) => void;
  closeNodeModal: () => void;
  setConfig: (value: NodeConfig) => void;
  setUploadedDatasourceId: (value: string) => void;
  setSelectedFile: (file: File | null) => void;
  setInputPreview: (preview: PreviewResponse | null) => void;
  setResultPreview: (preview: PreviewResponse | null) => void;
  setIsPreviewLoading: (value: boolean) => void;
  setActivePreviewTab: (value: 'input' | 'result') => void;
  setPreviewInfo: (value?: string) => void;
  setModalError: (value?: string) => void;
};

const getDefaultState = () => ({
  runId: null as string | null,
  canvasError: undefined as string | undefined,
  flowInstance: null as ReactFlowInstance | null,
  openCategories: {} as Record<string, boolean>,
  editingNodeId: null as string | null,
  config: {} as NodeConfig,
  uploadedDatasourceId: '',
  selectedFile: null as File | null,
  inputPreview: null as PreviewResponse | null,
  resultPreview: null as PreviewResponse | null,
  isPreviewLoading: false,
  activePreviewTab: 'input' as const,
  previewInfo: undefined as string | undefined,
  modalError: undefined as string | undefined,
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

  openNodeModal: (nodeId, config, datasourceId) =>
    set({
      editingNodeId: nodeId,
      config,
      uploadedDatasourceId: datasourceId,
      selectedFile: null,
      inputPreview: null,
      resultPreview: null,
      isPreviewLoading: false,
      activePreviewTab: 'input',
      previewInfo: undefined,
      modalError: undefined,
    }),

  closeNodeModal: () =>
    set({
      editingNodeId: null,
      selectedFile: null,
      inputPreview: null,
      resultPreview: null,
      isPreviewLoading: false,
      activePreviewTab: 'input',
      previewInfo: undefined,
      modalError: undefined,
    }),

  setConfig: (config) => set({ config }),
  setUploadedDatasourceId: (uploadedDatasourceId) => set({ uploadedDatasourceId }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setInputPreview: (inputPreview) => set({ inputPreview }),
  setResultPreview: (resultPreview) => set({ resultPreview }),
  setIsPreviewLoading: (isPreviewLoading) => set({ isPreviewLoading }),
  setActivePreviewTab: (activePreviewTab) => set({ activePreviewTab }),
  setPreviewInfo: (previewInfo) => set({ previewInfo }),
  setModalError: (modalError) => set({ modalError }),
}));
