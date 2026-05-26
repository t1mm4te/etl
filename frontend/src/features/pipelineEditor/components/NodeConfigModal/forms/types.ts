import type { NodeConfig } from '../../../../../shared/api/types';
import type { DataSourceDetail } from '../../../../../shared/api/types';

export type OperationConfigEditorProps = {
  config: NodeConfig;
  availableColumns: string[];
  availableColumnsByPort?: Record<string, string[]>;
  inputNodeLabelsByPort?: Record<string, string>;
  onChange: (config: NodeConfig) => void;
};

export type SourceFileConfigEditorProps = {
  selectedFile: File | null;
  selectedFileName?: string;
  selectedSheetName?: string;
  excelSheetNames: string[];
  isUploading?: boolean;
  uploadProgress?: number | null;
  onFileChange: (file: File | null, sheetName?: string) => void;
  onSheetNameChange: (sheetName: string) => void;
};

export type SourceDbConfigEditorProps = {
  onConnected?: (datasource: DataSourceDetail) => Promise<void> | void;
};
