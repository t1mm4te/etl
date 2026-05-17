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
  selectedSheetName?: string;
  excelSheetNames: string[];
  previewRowLimit: number;
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
  setSelectedSheetName: (value?: string) => void;
  setExcelSheetNames: (value: string[]) => void;
  setPreviewRowLimit: (value: number) => void;
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

function getStringArrayConfigValue(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

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
  selectedSheetName: undefined,
  excelSheetNames: [],
  previewRowLimit: 10,
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

  setSelectedSheetName: (value) => {
    set({ selectedSheetName: value });
  },

  setExcelSheetNames: (value) => {
    set({ excelSheetNames: value });
  },

  setPreviewRowLimit: (value) => {
    set({ previewRowLimit: value });
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
    const initialSelectedSheetName =
      typeof cfg.selected_sheet_name === 'string'
        ? cfg.selected_sheet_name
        : typeof cfg.sheet_name === 'string'
          ? cfg.sheet_name
          : undefined;
    const initialExcelSheetNames = getStringArrayConfigValue(cfg.excel_sheet_names);

    set({
      ...getDefaultModalState(),
      editingNodeId: node.id,
      config: { ...cfg },
      uploadedDatasourceId: currentDatasourceId,
      selectedFileName: initialSelectedFileName,
      selectedSheetName: initialSelectedSheetName,
      excelSheetNames:
        initialExcelSheetNames.length > 0
          ? initialExcelSheetNames
          : initialSelectedSheetName
            ? [initialSelectedSheetName]
            : [],
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
      selectedSheetName: state.selectedSheetName,
      excelSheetNames: state.excelSheetNames,
      previewRowLimit: state.previewRowLimit,
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
      setSelectedSheetName: state.setSelectedSheetName,
      setExcelSheetNames: state.setExcelSheetNames,
      setPreviewRowLimit: state.setPreviewRowLimit,
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
