import { useCallback, useEffect } from 'react';
import {
  getDatasourceDetail,
  previewDatasource,
  createDatasourceFromSheet,
  uploadSourceFile,
} from '../../../shared/api/pipelines';
import type {
  Node as ApiNode,
  NodeConfig,
  PreviewResponse,
  SourceFile,
} from '../../../shared/api/types';
import { extractError } from '../../../shared/lib/extractError';
import { buildNextNodeConfig } from './nodePreviewUtils';

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

function getSourceLabel(fileName: string) {
  return fileName;
}

type UseSourceNodePreviewActionsParams = {
  editingNode: ApiNode | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  sourceFileId: string;
  selectedSheetName?: string;
  excelSheetNames: string[];
  previewRowLimit: number;
  saveNodeConfig: (
    nodeId: string,
    config: NodeConfig,
    options?: { label?: string }
  ) => Promise<void>;
  loadAvailableColumns: (nodeId: string) => Promise<void>;
  closeModal: () => void;
  setConfig: (value: NodeConfig) => void;
  setSelectedFile: (value: File | null) => void;
  setSelectedFileName: (value?: string) => void;
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
  selectedSheetName,
  excelSheetNames,
  previewRowLimit,
  saveNodeConfig,
  loadAvailableColumns,
  closeModal,
  setConfig,
  setSelectedFile,
  setSelectedFileName,
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
    async (datasourceId: string, limit?: number) => {
      setIsPreviewLoading(true);
      setModalError(undefined);
      clearSourcePreviews();

      try {
        let datasource = await getDatasourceDetail(datasourceId);
        for (let attempt = 0; attempt < 30 && datasource.status === 'processing'; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          datasource = await getDatasourceDetail(datasourceId);
        }

        if (datasource.status === 'processing') {
          setSelectedFileName(datasource.original_filename || undefined);
          setResultPreview(null);
          setModalError(
            'Конвертация файла еще не завершена. Повторите попытку через несколько секунд.'
          );
          return;
        }

        if (datasource.status !== 'ready') {
          setSelectedFileName(datasource.original_filename || undefined);
          setResultPreview(null);
          if (datasource.status === 'error') {
            setModalError(
              'Не удалось подготовить DataSource. Проверьте файл и попробуйте еще раз.'
            );
          }
          return;
        }

        setSelectedFileName(datasource.original_filename || undefined);
        if (datasource.sheet_name) {
          setSelectedSheetName(datasource.sheet_name);
        }

        const previewData = await previewDatasource(datasourceId, limit ?? previewRowLimit);
        setResultPreview(previewData);
      } catch (error) {
        setModalError(extractError(error, 'Не удалось получить предпросмотр'));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      clearSourcePreviews,
      previewRowLimit,
      setIsPreviewLoading,
      setModalError,
      setResultPreview,
      setSelectedFileName,
      setSelectedSheetName,
    ]
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
      if (!editingNode) {
        return;
      }

      if (!file) {
        return;
      }

      if (editingNode.operation_type !== 'source_file') {
        setModalError('Автозагрузка файла доступна только для источника из файла');
        return;
      }

      setSelectedFile(file);
      setSelectedFileName(file.name);
      setModalError(undefined);

      try {
        const uploaded = await uploadSourceFile(file, file.name);
        const sourceFileId = uploaded.id;
        const sourceFileName = uploaded.filename || file.name;
        const sheetNames = (uploaded.sheets_metadata || []).map((sheet) => sheet.sheet_name);
        const nextConfig: NodeConfig = {
          ...config,
          source_file_id: sourceFileId,
        };
        delete nextConfig.datasource_id;
        delete nextConfig.selected_sheet_name;
        delete nextConfig.excel_sheet_names;

        setConfig(nextConfig);
        if (setSourceFileId) setSourceFileId(sourceFileId);
        if (setSourceFileMetadata) setSourceFileMetadata(uploaded);
        setUploadedDatasourceId('');
        setSelectedSheetName(undefined);
        setInputPreview(null);
        setLeftInputPreview(null);
        setRightInputPreview(null);
        setResultPreview(null);
        setExcelSheetNames(sheetNames);
        setSelectedFileName(sourceFileName);

        await saveNodeConfig(editingNode.id, nextConfig, { label: getSourceLabel(sourceFileName) });

        if (getFileExtension(sourceFileName) === 'csv') {
          const defaultSheetName = sheetNames[0] ?? 'default';
          const created = await createDatasourceFromSheet(sourceFileId, defaultSheetName);
          const readyConfig: NodeConfig = {
            ...nextConfig,
            datasource_id: created.id,
            selected_sheet_name: defaultSheetName,
          };

          setConfig(readyConfig);
          setUploadedDatasourceId(created.id);
          setSelectedSheetName(defaultSheetName);
          await saveNodeConfig(editingNode.id, readyConfig, {
            label: getSourceLabel(sourceFileName),
          });
          await fetchSourcePreview(created.id);
          await loadAvailableColumns(editingNode.id);
          return;
        }
      } catch (error) {
        setModalError(extractError(error, 'Не удалось загрузить файл'));
      }
    },
    [
      config,
      editingNode,
      fetchSourcePreview,
      loadAvailableColumns,
      saveNodeConfig,
      setExcelSheetNames,
      setInputPreview,
      setLeftInputPreview,
      setRightInputPreview,
      setResultPreview,
      setConfig,
      setModalError,
      setSelectedFile,
      setSelectedFileName,
      setSelectedSheetName,
      setUploadedDatasourceId,
      setSourceFileId,
      setSourceFileMetadata,
    ]
  );

  // Refetch preview when row limit changes
  useEffect(() => {
    if (uploadedDatasourceId) {
      fetchSourcePreview(uploadedDatasourceId);
    }
  }, [previewRowLimit, uploadedDatasourceId, fetchSourcePreview]);

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
        const created = await createDatasourceFromSheet(effectiveSourceFileId, sheetName);
        setUploadedDatasourceId(created.id);

        const nextConfig = buildNextNodeConfig(
          {
            ...config,
            source_file_id: effectiveSourceFileId,
          },
          created.id,
          {
            selectedSheetName: created.sheet_name || sheetName,
            excelSheetNames: excelSheetNames,
          }
        );

        setConfig(nextConfig);
        await saveNodeConfig(editingNode.id, nextConfig, {
          label: getSourceLabel(created.original_filename || sheetName),
        });
        await fetchSourcePreview(created.id);
        await loadAvailableColumns(editingNode.id);
      } catch (error) {
        setModalError(extractError(error, 'Не удалось создать DataSource из листа'));
      }
    },
    [
      config,
      editingNode,
      fetchSourcePreview,
      loadAvailableColumns,
      saveNodeConfig,
      setConfig,
      setModalError,
      setSelectedSheetName,
      setUploadedDatasourceId,
      excelSheetNames,
      sourceFileId,
    ]
  );

  const onPreviewRowLimitChange = useCallback(
    (limit: number) => {
      setPreviewRowLimit(limit);
    },
    [setPreviewRowLimit]
  );

  return {
    fetchSourcePreview,
    onSaveNodeConfig,
    onFileChange,
    onSheetNameChange,
    onPreviewRowLimitChange,
  };
}
