import type { NodeConfig } from '../../../../api/types';

export type OperationConfigEditorProps = {
  config: NodeConfig;
  availableColumns: string[];
  onChange: (config: NodeConfig) => void;
};

export type SourceFileConfigEditorProps = {
  selectedFile: File | null;
  datasourceId?: string;
  onFileChange: (file: File | null) => void;
  onUploadFile: () => void;
  onRefreshSourcePreview: () => void;
};

export type SourceDbConfigEditorProps = {
  datasourceId?: string;
  onRefreshSourcePreview: () => void;
};
