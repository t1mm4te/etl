import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../api/types';

export type PreviewTab = 'input' | 'left_input' | 'right_input' | 'result';

export type NodeConfigModalState = {
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
    set({ config: value });
  },

  setSelectedFile: (value) => {
    set({ selectedFile: value });
  },

  setUploadedDatasourceId: (value) => {
    set({ uploadedDatasourceId: value });
  },

  setInputPreview: (value) => {
    set({ inputPreview: value });
  },

  setLeftInputPreview: (value) => {
    set({ leftInputPreview: value });
  },

  setRightInputPreview: (value) => {
    set({ rightInputPreview: value });
  },

  setResultPreview: (value) => {
    set({ resultPreview: value });
  },

  setIsPreviewLoading: (value) => {
    set({ isPreviewLoading: value });
  },

  setActivePreviewTab: (value) => {
    set({ activePreviewTab: value });
  },

  setPreviewInfo: (value) => {
    set({ previewInfo: value });
  },

  setModalError: (value) => {
    set({ modalError: value });
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

export function useNodeConfigModalStateSlice() {
  return useNodeConfigModalStore(
    useShallow((state) => ({
      editingNodeId: state.editingNodeId,
      config: state.config,
      selectedFile: state.selectedFile,
      uploadedDatasourceId: state.uploadedDatasourceId,
      inputPreview: state.inputPreview,
      leftInputPreview: state.leftInputPreview,
      rightInputPreview: state.rightInputPreview,
      resultPreview: state.resultPreview,
      isPreviewLoading: state.isPreviewLoading,
      activePreviewTab: state.activePreviewTab,
      previewInfo: state.previewInfo,
      modalError: state.modalError,
    }))
  );
}

export function useNodeConfigModalActions() {
  return useNodeConfigModalStore(
    useShallow((state) => ({
      setConfig: state.setConfig,
      setSelectedFile: state.setSelectedFile,
      setUploadedDatasourceId: state.setUploadedDatasourceId,
      setInputPreview: state.setInputPreview,
      setLeftInputPreview: state.setLeftInputPreview,
      setRightInputPreview: state.setRightInputPreview,
      setResultPreview: state.setResultPreview,
      setIsPreviewLoading: state.setIsPreviewLoading,
      setActivePreviewTab: state.setActivePreviewTab,
      setPreviewInfo: state.setPreviewInfo,
      setModalError: state.setModalError,
      openNodeModalState: state.openNodeModalState,
      closeNodeModalState: state.closeNodeModalState,
    }))
  );
}
