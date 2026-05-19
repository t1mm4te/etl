import type { NodeConfig } from '../../../../../shared/api/types';
import type { SourceFile } from '../../../../../shared/api/types';

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
  sourceFileMetadata?: SourceFile | null;
  selectedSheetName?: string;
  excelSheetNames: string[];
  onFileChange: (file: File | null, sheetName?: string) => void;
  onSheetNameChange: (sheetName: string) => void;
};

export type SourceDbConfigEditorProps = {
  datasourceId?: string;
};
