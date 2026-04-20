import { create } from 'zustand';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../api/types';

export type PreviewTab = 'input' | 'left_input' | 'right_input' | 'result';

type NodeConfigModalState = {
  editingNodeId: string | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  selectedFile: File | null;
  inputPreview: PreviewResponse | null;
  leftInputPreview: PreviewResponse | null;
  rightInputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
  isPreviewLoading: boolean;
  activePreviewTab: PreviewTab;
  previewInfo?: string;
  modalError?: string;
};

export type NodeConfigModalActions = {
  setConfig: (value: NodeConfig) => void;
  setSelectedFile: (value: File | null) => void;
  setUploadedDatasourceId: (value: string) => void;
  setInputPreview: (value: PreviewResponse | null) => void;
  setLeftInputPreview: (value: PreviewResponse | null) => void;
  setRightInputPreview: (value: PreviewResponse | null) => void;
  setResultPreview: (value: PreviewResponse | null) => void;
  setIsPreviewLoading: (value: boolean) => void;
  setActivePreviewTab: (value: PreviewTab) => void;
  setPreviewInfo: (value?: string) => void;
  setModalError: (value?: string) => void;
  openNodeModalState: (node: ApiNode) => void;
  closeNodeModalState: () => void;
};

export type NodeConfigModalStore = NodeConfigModalState & NodeConfigModalActions;

const getDefaultModalState = (): NodeConfigModalState => ({
  editingNodeId: null,
  config: {},
  uploadedDatasourceId: '',
  selectedFile: null,
  inputPreview: null,
  leftInputPreview: null,
  rightInputPreview: null,
  resultPreview: null,
  isPreviewLoading: false,
  activePreviewTab: 'input',
  previewInfo: undefined,
  modalError: undefined,
});

export const useNodeConfigModalStore = create<NodeConfigModalStore>((set) => ({
  ...getDefaultModalState(),

  setConfig: (value) => {
    set((state) => ({ ...state, config: value }));
  },

  setSelectedFile: (value) => {
    set((state) => ({ ...state, selectedFile: value }));
  },

  setUploadedDatasourceId: (value) => {
    set((state) => ({ ...state, uploadedDatasourceId: value }));
  },

  setInputPreview: (value) => {
    set((state) => ({ ...state, inputPreview: value }));
  },

  setLeftInputPreview: (value) => {
    set((state) => ({ ...state, leftInputPreview: value }));
  },

  setRightInputPreview: (value) => {
    set((state) => ({ ...state, rightInputPreview: value }));
  },

  setResultPreview: (value) => {
    set((state) => ({ ...state, resultPreview: value }));
  },

  setIsPreviewLoading: (value) => {
    set((state) => ({ ...state, isPreviewLoading: value }));
  },

  setActivePreviewTab: (value) => {
    set((state) => ({ ...state, activePreviewTab: value }));
  },

  setPreviewInfo: (value) => {
    set((state) => ({ ...state, previewInfo: value }));
  },

  setModalError: (value) => {
    set((state) => ({ ...state, modalError: value }));
  },

  openNodeModalState: (node) => {
    const cfg = node.config ?? {};
    const currentDatasourceId = typeof cfg.datasource_id === 'string' ? cfg.datasource_id : '';

    set({
      ...getDefaultModalState(),
      editingNodeId: node.id,
      config: { ...cfg },
      uploadedDatasourceId: currentDatasourceId,
    });
  },

  closeNodeModalState: () => {
    set(getDefaultModalState());
  },
}));
