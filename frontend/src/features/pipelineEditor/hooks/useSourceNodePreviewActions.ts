import { useCallback, useEffect } from 'react';
import {
  getDatasourceDetail,
  previewDatasource,
  setDatasourceSheet,
  uploadDatasource,
} from '../../../shared/api/pipelines';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../shared/api/types';
import { extractError } from '../../../shared/lib/extractError';
import { buildNextNodeConfig } from './nodePreviewUtils';

type UseSourceNodePreviewActionsParams = {
  editingNode: ApiNode | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
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

function buildSourceFileLabel(fileName: string) {
  return `Загрузка файла: ${fileName}`;
}

export function useSourceNodePreviewActions({
  editingNode,
  config,
  uploadedDatasourceId,
  selectedSheetName,
  excelSheetNames,
  previewRowLimit,
  saveNodeConfig,
  loadAvailableColumns,
  closeModal,
  setConfig,
  setSelectedFile,
  setSelectedFileName,
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
        const datasource = await getDatasourceDetail(datasourceId);
        if (datasource.status !== 'ready') {
          setSelectedFileName(datasource.original_filename || undefined);
          setResultPreview(null);
          return;
        }

        setSelectedFileName(datasource.original_filename || undefined);
        if (datasource.available_sheets && datasource.available_sheets.length > 0) {
          setExcelSheetNames(datasource.available_sheets);
        }

        if (datasource.sheet_name) {
          setSelectedSheetName(datasource.sheet_name);
          if (
            (!datasource.available_sheets || datasource.available_sheets.length === 0) &&
            excelSheetNames.length === 0
          ) {
            setExcelSheetNames([datasource.sheet_name]);
          }
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
      setExcelSheetNames,
      excelSheetNames,
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
        const uploaded = await uploadDatasource(file, file.name);
        setUploadedDatasourceId(uploaded.id);

        if (uploaded.available_sheets && uploaded.available_sheets.length > 0) {
          setExcelSheetNames(uploaded.available_sheets);
        }

        if (uploaded.sheet_name) {
          setSelectedSheetName(uploaded.sheet_name);
        }

        const nextConfig = buildNextNodeConfig(config, uploaded.id, {
          selectedSheetName: uploaded.sheet_name || selectedSheetName,
          excelSheetNames:
            uploaded.available_sheets && uploaded.available_sheets.length > 0
              ? uploaded.available_sheets
              : excelSheetNames,
        });
        const nextLabel = buildSourceFileLabel(file.name);
        setConfig(nextConfig);

        await saveNodeConfig(editingNode.id, nextConfig, { label: nextLabel });
        await fetchSourcePreview(uploaded.id);
        await loadAvailableColumns(editingNode.id);
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
      selectedSheetName,
      setExcelSheetNames,
      setConfig,
      setModalError,
      setSelectedFile,
      setSelectedFileName,
      setSelectedSheetName,
      setUploadedDatasourceId,
      excelSheetNames,
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

      const datasourceId =
        uploadedDatasourceId ||
        (typeof config.datasource_id === 'string' ? config.datasource_id : '');

      if (!datasourceId) {
        setModalError('Сначала загрузите файл, затем выберите лист.');
        return;
      }

      try {
        const updatedDatasource = await setDatasourceSheet(datasourceId, sheetName);
        setUploadedDatasourceId(updatedDatasource.id);

        const nextConfig = buildNextNodeConfig(config, updatedDatasource.id, {
          selectedSheetName: updatedDatasource.sheet_name || sheetName,
          excelSheetNames:
            updatedDatasource.available_sheets && updatedDatasource.available_sheets.length > 0
              ? updatedDatasource.available_sheets
              : excelSheetNames,
        });

        setConfig(nextConfig);
        await saveNodeConfig(editingNode.id, nextConfig);
        await fetchSourcePreview(updatedDatasource.id);
        await loadAvailableColumns(editingNode.id);
      } catch (error) {
        setModalError(
          extractError(
            error,
            'Переключение листа пока недоступно. Функционал будет работать после обновления backend.'
          )
        );
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
      uploadedDatasourceId,
      excelSheetNames,
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
