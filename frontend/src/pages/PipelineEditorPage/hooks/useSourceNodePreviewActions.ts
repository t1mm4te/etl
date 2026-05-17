import { useCallback } from 'react';
import {
  getDatasourceDetail,
  previewDatasource,
  setDatasourceSheet,
  uploadDatasource,
} from '../../../api/pipelines';
import type { Node as ApiNode, NodeConfig } from '../../../api/types';
import { extractError } from '../../../lib/extractError';
import {
  useNodeConfigModalActions,
  useNodeConfigModalStateSlice,
} from '../../../store/nodeConfigModalStore';
import { buildNextNodeConfig } from './nodePreviewUtils';

type UseSourceNodePreviewActionsParams = {
  editingNode: ApiNode | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  selectedSheetName?: string;
  previewRowLimit: number;
  saveNodeConfig: (
    nodeId: string,
    config: NodeConfig,
    options?: { label?: string }
  ) => Promise<void>;
  loadAvailableColumns: (nodeId: string) => Promise<void>;
  closeModal: () => void;
};

function buildSourceFileLabel(fileName: string) {
  return `Загрузка файла: ${fileName}`;
}

export function useSourceNodePreviewActions({
  editingNode,
  config,
  uploadedDatasourceId,
  selectedSheetName,
  previewRowLimit,
  saveNodeConfig,
  loadAvailableColumns,
  closeModal,
}: UseSourceNodePreviewActionsParams) {
  const {
    setConfig,
    setSelectedFile,
    setSelectedFileName,
    setSelectedSheetName,
    setExcelSheetNames,
    setUploadedDatasourceId,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setPreviewInfo,
    setModalError,
  } = useNodeConfigModalActions();

  const { excelSheetNames } = useNodeConfigModalStateSlice();

  const clearSourcePreviews = useCallback(() => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
  }, [setInputPreview, setLeftInputPreview, setResultPreview, setRightInputPreview]);

  const fetchSourcePreview = useCallback(
    async (datasourceId: string, limit?: number) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);
      clearSourcePreviews();

      try {
        const datasource = await getDatasourceDetail(datasourceId);
        if (datasource.status !== 'ready') {
          setSelectedFileName(datasource.original_filename || undefined);
          setResultPreview(null);
          setPreviewInfo(`Источник в статусе ${datasource.status}. Данные ещё обрабатываются.`);
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
      setPreviewInfo,
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
      setPreviewInfo(undefined);
      setModalError(undefined);

      try {
        const uploaded = await uploadDatasource(file, file.name);
        setUploadedDatasourceId(uploaded.id);
        setPreviewInfo('Файл загружен. Загружаем предпросмотр...');

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
      setPreviewInfo,
      setSelectedFile,
      setSelectedFileName,
      setSelectedSheetName,
      setUploadedDatasourceId,
      excelSheetNames,
    ]
  );

  const onSheetNameChange = useCallback(
    async (sheetName: string) => {
      setModalError(undefined);
      setPreviewInfo(undefined);
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
      setPreviewInfo,
      setSelectedSheetName,
      setUploadedDatasourceId,
      uploadedDatasourceId,
      excelSheetNames,
    ]
  );

  const onPreviewRowLimitChange = useCallback(
    async (limit?: number) => {
      if (uploadedDatasourceId) {
        await fetchSourcePreview(uploadedDatasourceId, limit);
      }
    },
    [fetchSourcePreview, uploadedDatasourceId]
  );

  return {
    fetchSourcePreview,
    onSaveNodeConfig,
    onFileChange,
    onPreviewRowLimitChange,
    onSheetNameChange,
  };
}
