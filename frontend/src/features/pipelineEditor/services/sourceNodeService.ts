import type { AxiosProgressEvent } from 'axios';
import { createDatasourceFromSheet, uploadSourceFile } from '../../../shared/api/pipelines';
import type { NodeConfig } from '../../../shared/api/types';
import { getFileExtension } from '../utils/sourceNodePreviewUtils';
import { buildNextNodeConfig } from '../utils/nodePreviewUtils';

type UploadSourceAndCreateDatasourceParams = {
  file: File;
  config: NodeConfig;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
};

type UploadSourceAndCreateDatasourceResult = {
  sourceFileId: string;
  sourceFileName: string;
  sheetNames: string[];
  defaultSheetName?: string;
  uploadedConfig: NodeConfig;
  readyConfig?: NodeConfig;
  datasourceId?: string;
  datasourceName: string;
};

export async function uploadSourceAndCreateDatasource({
  file,
  config,
  onUploadProgress,
}: UploadSourceAndCreateDatasourceParams): Promise<UploadSourceAndCreateDatasourceResult> {
  const uploaded = await uploadSourceFile(file, file.name, { onUploadProgress });
  const sourceFileIdValue = uploaded.id;
  const sheetNames = (uploaded.sheets_metadata || []).map((sheet) => sheet.sheet_name);
  const sourceFileName = uploaded.original_filename || file.name;
  const uploadedConfig = {
    ...config,
    source_file_id: sourceFileIdValue,
  };

  const isCsv = getFileExtension(sourceFileName) === 'csv';
  const defaultSheetName = sheetNames[0] ?? (isCsv ? 'default' : undefined);
  const datasourceResult = await createDatasourceFromSheet(sourceFileIdValue, defaultSheetName);

  const readyConfig: NodeConfig = {
    ...uploadedConfig,
    datasource_id: datasourceResult.id,
    selected_sheet_name: defaultSheetName,
  };

  return {
    sourceFileId: sourceFileIdValue,
    sourceFileName,
    sheetNames,
    defaultSheetName,
    uploadedConfig,
    readyConfig,
    datasourceId: datasourceResult.id,
    datasourceName: datasourceResult.name,
  };
}

type createDatasourceForSheetParams = {
  sourceFileId: string;
  sheetName: string;
  config: NodeConfig;
  excelSheetNames: string[];
};

type createDatasourceForSheetResult = {
  datasourceId: string;
  datasourceName: string;
  nextConfig: NodeConfig;
};

export async function createDatasourceForSheet({
  sourceFileId,
  sheetName,
  config,
  excelSheetNames,
}: createDatasourceForSheetParams): Promise<createDatasourceForSheetResult> {
  const datasource = await createDatasourceFromSheet(sourceFileId, sheetName);

  const nextConfig = buildNextNodeConfig(
    {
      ...config,
      source_file_id: sourceFileId,
    },
    datasource.id,
    {
      selectedSheetName: sheetName,
      excelSheetNames,
    }
  );

  return {
    datasourceId: datasource.id,
    datasourceName: datasource.name,
    nextConfig,
  };
}
