import type { AxiosProgressEvent } from 'axios';
import {
  createDatasourceFromSheet,
  getDatasourceDetail,
  previewDatasource,
  uploadSourceFile,
} from '../../../shared/api/pipelines';
import type { NodeConfig, PreviewResponse, SourceFile } from '../../../shared/api/types';
import { extractError } from '../../../shared/lib/extractError';
import { getFileExtension } from '../utils/sourceNodePreviewUtils';
import { buildNextNodeConfig } from '../utils/nodePreviewUtils';

type FetchSourcePreviewDataParams = {
  datasourceId: string;
  rowLimit?: number;
};

type FetchSourcePreviewDataResult = {
  preview: PreviewResponse | null;
  error?: string;
};

export async function fetchSourcePreviewData({
  datasourceId,
  rowLimit = 15,
}: FetchSourcePreviewDataParams): Promise<FetchSourcePreviewDataResult> {
  try {
    let datasource = await getDatasourceDetail(datasourceId);

    for (let attempt = 0; attempt < 30 && datasource.status === 'processing'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      datasource = await getDatasourceDetail(datasourceId);
    }

    if (datasource.status === 'processing') {
      return {
        preview: null,
        error: 'Конвертация файла еще не завершена. Повторите попытку через несколько секунд.',
      };
    }

    if (datasource.status !== 'ready') {
      return {
        preview: null,
        error:
          datasource.status === 'error'
            ? datasource.error_message ||
              'Не удалось подготовить DataSource. Проверьте файл и попробуйте еще раз.'
            : undefined,
      };
    }

    const previewData = await previewDatasource(datasourceId, rowLimit);
    return {
      preview: previewData,
    };
  } catch (error) {
    throw new Error(extractError(error, 'Не удалось получить предпросмотр'));
  }
}

type UploadSourceFileParams = {
  file: File;
  fileName: string;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
};

type UploadSourceFileResult = {
  sourceFile: SourceFile;
  sheetNames: string[];
  config: NodeConfig;
};

export async function uploadSourceFileHelper({
  file,
  fileName,
  onUploadProgress,
}: UploadSourceFileParams): Promise<UploadSourceFileResult> {
  const uploaded = await uploadSourceFile(file, fileName, { onUploadProgress });
  const sourceFileIdValue = uploaded.id;
  const sheetNames = (uploaded.sheets_metadata || []).map((sheet) => sheet.sheet_name);

  const config: NodeConfig = {
    source_file_id: sourceFileIdValue,
  };

  return {
    sourceFile: uploaded,
    sheetNames,
    config,
  };
}

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
  datasourceId?: string;
  readyConfig?: NodeConfig;
};

export async function uploadSourceAndCreateDatasource({
  file,
  config,
  onUploadProgress,
}: UploadSourceAndCreateDatasourceParams): Promise<UploadSourceAndCreateDatasourceResult> {
  const uploadResult = await uploadSourceFileHelper({
    file,
    fileName: file.name,
    onUploadProgress,
  });

  const sourceFileIdValue = uploadResult.sourceFile.id;
  const sourceFileName = uploadResult.sourceFile.filename || file.name;
  const sheetNames = uploadResult.sheetNames;
  const uploadedConfig = {
    ...config,
    ...uploadResult.config,
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
    nextConfig,
  };
}
