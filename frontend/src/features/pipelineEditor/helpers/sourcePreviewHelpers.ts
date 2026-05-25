import type { AxiosProgressEvent } from 'axios';
import {
  getDatasourceDetail,
  previewDatasource,
  uploadSourceFile,
} from '../../../shared/api/pipelines';
import type { NodeConfig, PreviewResponse, SourceFile } from '../../../shared/api/types';
import { extractError } from '../../../shared/lib/extractError';

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
  try {
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
  } catch (error) {
    throw new Error(extractError(error, 'Не удалось загрузить файл'));
  }
}
