import { useCallback } from 'react';
import type { AxiosProgressEvent } from 'axios';
import type {
  Node as ApiNode,
  NodeConfig,
  PreviewResponse,
  SourceFile,
} from '../../../shared/api/types';
import { buildNextNodeConfig } from '../utils/nodePreviewUtils';
import {
  getFileExtension,
  getSourceLabel,
  resolveSourceFileName,
} from '../utils/sourceNodePreviewUtils';
import { fetchSourcePreviewData, uploadSourceFileHelper } from '../helpers/sourcePreviewHelpers';
import { extractError } from '../../../shared/lib/extractError';
import { createDatasourceFromSheet } from '../../../shared/api/pipelines';

type UseSourceNodePreviewActionsParams = {
  editingNode: ApiNode | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  sourceFileId: string;
  sourceFileMetadata: SourceFile | null;
  selectedFileName?: string;
  selectedSheetName?: string;
  excelSheetNames: string[];
  previewRowLimit: number;
  saveNodeConfig: (
    nodeId: string,
    config: NodeConfig,
    options?: { label?: string }
  ) => Promise<void>;
  closeModal: () => void;
  setConfig: (value: NodeConfig) => void;
  setSelectedFile: (value: File | null) => void;
  setSelectedFileName: (value?: string) => void;
  setIsSourceFileUploading: (value: boolean) => void;
  setSourceFileUploadProgress: (value: number | null) => void;
  setSourceFileId?: (value: string) => void;
  setSourceFileMetadata?: (value: SourceFile | null) => void;
  setSelectedSheetName: (value?: string) => void;
  setExcelSheetNames: (value: string[]) => void;
  setUploadedDatasourceId: (value: string) => void;
  setPreviewRowLimit: (value: number) => void;
  setInputPreview: (value: PreviewResponse | null) => void;
  setLeftInputPreview: (value: PreviewResponse | null) => void;
  setRightInputPreview: (value: PreviewResponse | null) => void;
  setResultPreview: (value: PreviewResponse | null) => void;
  setIsPreviewLoading: (value: boolean) => void;
  setModalError: (value?: string) => void;
};

export function useSourceNodePreviewActions({
  editingNode,
  config,
  uploadedDatasourceId,
  sourceFileId,
  sourceFileMetadata,
  selectedFileName,
  selectedSheetName,
  excelSheetNames,
  previewRowLimit,
  saveNodeConfig,
  closeModal,
  setConfig,
  setSelectedFile,
  setSelectedFileName,
  setIsSourceFileUploading,
  setSourceFileUploadProgress,
  setSourceFileId,
  setSourceFileMetadata,
  setSelectedSheetName,
  setExcelSheetNames,
  setUploadedDatasourceId,
  setPreviewRowLimit,
  setInputPreview,
  setLeftInputPreview,
  setRightInputPreview,
  setResultPreview,
  setIsPreviewLoading,
  setModalError,
}: UseSourceNodePreviewActionsParams) {
  const clearSourcePreviews = useCallback(() => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
  }, [setInputPreview, setLeftInputPreview, setResultPreview, setRightInputPreview]);

  const fetchSourcePreview = useCallback(
    async (datasourceId: string, limit = previewRowLimit) => {
      setIsPreviewLoading(true);
      setModalError(undefined);
      clearSourcePreviews();

      try {
        const result = await fetchSourcePreviewData({
          datasourceId,
          rowLimit: limit,
        });

        if (result.error) {
          setResultPreview(null);
          setModalError(result.error);
          return;
        }

        setResultPreview(result.preview);
      } catch (error) {
        setModalError(String(error));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [clearSourcePreviews, previewRowLimit, setIsPreviewLoading, setModalError, setResultPreview]
  );

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const nextConfig = buildNextNodeConfig(config, uploadedDatasourceId, {
        selectedSheetName,
        excelSheetNames,
      });
      await saveNodeConfig(editingNode.id, nextConfig);
      closeModal();
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
    }
  }, [
    closeModal,
    config,
    editingNode,
    excelSheetNames,
    saveNodeConfig,
    selectedSheetName,
    setModalError,
    uploadedDatasourceId,
  ]);

  const onFileChange = useCallback(
    async (file: File | null) => {
      if (!editingNode || !file) {
        return;
      }

      if (editingNode.operation_type !== 'source_file') {
        setModalError('Автозагрузка файла доступна только для источника из файла');
        return;
      }

      setSelectedFile(file);
      setSelectedFileName(file.name);
      setModalError(undefined);
      setIsSourceFileUploading(true);
      setSourceFileUploadProgress(0);

      const onUploadProgress = (progressEvent: AxiosProgressEvent) => {
        if (!progressEvent.total) {
          return;
        }

        const percent = Math.min(
          100,
          Math.round((progressEvent.loaded / progressEvent.total) * 100)
        );
        setSourceFileUploadProgress(percent);
      };

      try {
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

        setConfig(uploadedConfig);
        if (setSourceFileId) setSourceFileId(sourceFileIdValue);
        if (setSourceFileMetadata) setSourceFileMetadata(uploadResult.sourceFile);

        setUploadedDatasourceId('');
        setSelectedSheetName(undefined);
        setExcelSheetNames(sheetNames);
        setSelectedFileName(sourceFileName);
        setSourceFileUploadProgress(100);
        setInputPreview(null);
        setLeftInputPreview(null);
        setRightInputPreview(null);
        setResultPreview(null);

        await saveNodeConfig(editingNode.id, uploadedConfig, {
          label: getSourceLabel(sourceFileName),
        });

        const isCsv = getFileExtension(sourceFileName) === 'csv';
        const defaultSheetName = sheetNames[0] ?? (isCsv ? 'default' : undefined);
        if (!defaultSheetName) {
          return;
        }

        const datasourceResult = await createDatasourceFromSheet(
          sourceFileIdValue,
          defaultSheetName
        );

        const readyConfig: NodeConfig = {
          ...uploadedConfig,
          datasource_id: datasourceResult.id,
          selected_sheet_name: defaultSheetName,
        };

        setConfig(readyConfig);
        setUploadedDatasourceId(datasourceResult.id);
        setSelectedSheetName(defaultSheetName);
        await saveNodeConfig(editingNode.id, readyConfig, {
          label: getSourceLabel(sourceFileName, defaultSheetName, sheetNames),
        });
        await fetchSourcePreview(datasourceResult.id);
      } catch (error) {
        setModalError(String(error));
      } finally {
        setIsSourceFileUploading(false);
        setSourceFileUploadProgress(null);
      }
    },
    [
      config,
      editingNode,
      fetchSourcePreview,
      saveNodeConfig,
      setConfig,
      setExcelSheetNames,
      setInputPreview,
      setIsSourceFileUploading,
      setLeftInputPreview,
      setModalError,
      setResultPreview,
      setRightInputPreview,
      setSelectedFile,
      setSelectedFileName,
      setSelectedSheetName,
      setSourceFileId,
      setSourceFileMetadata,
      setSourceFileUploadProgress,
      setUploadedDatasourceId,
    ]
  );

  const onSheetNameChange = useCallback(
    async (sheetName: string) => {
      setModalError(undefined);
      setSelectedSheetName(sheetName);

      if (!editingNode) {
        return;
      }

      const effectiveSourceFileId =
        sourceFileId || (typeof config.source_file_id === 'string' ? config.source_file_id : '');

      if (!effectiveSourceFileId) {
        setModalError('Сначала загрузите файл, затем выберите лист.');
        return;
      }

      try {
        const datasourceResult = await createDatasourceFromSheet(effectiveSourceFileId, sheetName);

        setUploadedDatasourceId(datasourceResult.id);
        const sourceLabelFileName = resolveSourceFileName(
          undefined,
          sourceFileMetadata?.filename || selectedFileName,
          sheetName
        );

        const nextConfig = buildNextNodeConfig(
          {
            ...config,
            source_file_id: effectiveSourceFileId,
          },
          datasourceResult.id,
          {
            selectedSheetName: sheetName,
            excelSheetNames,
          }
        );

        setConfig(nextConfig);
        await saveNodeConfig(editingNode.id, nextConfig, {
          label: getSourceLabel(sourceLabelFileName, sheetName, excelSheetNames),
        });
        await fetchSourcePreview(datasourceResult.id);
      } catch (error) {
        setModalError(String(error));
      }
    },
    [
      config,
      editingNode,
      excelSheetNames,
      fetchSourcePreview,
      saveNodeConfig,
      selectedFileName,
      setConfig,
      setModalError,
      setSelectedSheetName,
      setUploadedDatasourceId,
      sourceFileId,
      sourceFileMetadata?.filename,
    ]
  );

  const onPreviewRowLimitChange = useCallback(
    (limit: number) => {
      setPreviewRowLimit(limit);
      if (uploadedDatasourceId) {
        void fetchSourcePreview(uploadedDatasourceId, limit);
      }
    },
    [fetchSourcePreview, setPreviewRowLimit, uploadedDatasourceId]
  );

  return {
    fetchSourcePreview,
    onSaveNodeConfig,
    onFileChange,
    onSheetNameChange,
    onPreviewRowLimitChange,
  };
}
