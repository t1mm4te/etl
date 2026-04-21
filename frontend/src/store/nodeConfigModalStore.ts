import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../api/types';

export type PreviewTab = 'input' | 'left_input' | 'right_input' | 'result';

export type NodeConfigModalState = {
  editingNodeId: string | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  selectedFile: File | null;
  selectedFileName?: string;
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
  setSelectedFileName: (value?: string) => void;
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

const SOURCE_FILE_LABEL_PREFIX = 'Загрузка файла: ';

function getSourceFileNameFromNodeLabel(operationType: string, label: string) {
  if (operationType !== 'source_file') {
    return undefined;
  }

  if (!label.startsWith(SOURCE_FILE_LABEL_PREFIX)) {
    return undefined;
  }

  const parsed = label.slice(SOURCE_FILE_LABEL_PREFIX.length).trim();
  return parsed.length > 0 ? parsed : undefined;
}

const getDefaultModalState = (): NodeConfigModalState => ({
  editingNodeId: null,
  config: {},
  uploadedDatasourceId: '',
  selectedFile: null,
  selectedFileName: undefined,
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

  setSelectedFileName: (value) => {
    set({ selectedFileName: value });
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
    const initialSelectedFileName = getSourceFileNameFromNodeLabel(node.operation_type, node.label);

    set({
      ...getDefaultModalState(),
      editingNodeId: node.id,
      config: { ...cfg },
      uploadedDatasourceId: currentDatasourceId,
      selectedFileName: initialSelectedFileName,
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
      selectedFileName: state.selectedFileName,
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
      setSelectedFileName: state.setSelectedFileName,
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
