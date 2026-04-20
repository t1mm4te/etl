import { useCallback } from 'react';
import { getDatasourceDetail, previewDatasource, uploadDatasource } from '../../../api/pipelines';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../api/types';
import { extractError } from '../../../lib/extractError';
import { buildNextNodeConfig } from './nodePreviewUtils';

type UseSourceNodePreviewActionsParams = {
  editingNode: ApiNode | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
  saveNodeConfig: (nodeId: string, config: NodeConfig) => Promise<void>;
  setConfig: (value: NodeConfig) => void;
  setSelectedFile: (value: File | null) => void;
  setUploadedDatasourceId: (value: string) => void;
  setInputPreview: (value: PreviewResponse | null) => void;
  setLeftInputPreview: (value: PreviewResponse | null) => void;
  setRightInputPreview: (value: PreviewResponse | null) => void;
  setResultPreview: (value: PreviewResponse | null) => void;
  setIsPreviewLoading: (value: boolean) => void;
  setPreviewInfo: (value?: string) => void;
  setModalError: (value?: string) => void;
  loadAvailableColumns: (nodeId: string) => Promise<void>;
  closeModal: () => void;
};

export function useSourceNodePreviewActions({
  editingNode,
  config,
  uploadedDatasourceId,
  saveNodeConfig,
  setConfig,
  setSelectedFile,
  setUploadedDatasourceId,
  setInputPreview,
  setLeftInputPreview,
  setRightInputPreview,
  setResultPreview,
  setIsPreviewLoading,
  setPreviewInfo,
  setModalError,
  loadAvailableColumns,
  closeModal,
}: UseSourceNodePreviewActionsParams) {
  const clearSourcePreviews = useCallback(() => {
    setInputPreview(null);
    setLeftInputPreview(null);
    setRightInputPreview(null);
    setResultPreview(null);
  }, [setInputPreview, setLeftInputPreview, setResultPreview, setRightInputPreview]);

  const fetchSourcePreview = useCallback(
    async (datasourceId: string) => {
      setIsPreviewLoading(true);
      setPreviewInfo(undefined);
      setModalError(undefined);
      clearSourcePreviews();

      try {
        const datasource = await getDatasourceDetail(datasourceId);
        if (datasource.status !== 'ready') {
          setResultPreview(null);
          setPreviewInfo(`Источник в статусе ${datasource.status}. Данные ещё обрабатываются.`);
          return;
        }

        const previewData = await previewDatasource(datasourceId, 10);
        setResultPreview(previewData);
      } catch (error) {
        setModalError(extractError(error, 'Не удалось получить предпросмотр'));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [clearSourcePreviews, setIsPreviewLoading, setModalError, setPreviewInfo, setResultPreview]
  );

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const nextConfig = buildNextNodeConfig(config, uploadedDatasourceId);
      await saveNodeConfig(editingNode.id, nextConfig);
      closeModal();
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
    }
  }, [closeModal, config, editingNode, saveNodeConfig, setModalError, uploadedDatasourceId]);

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
      setPreviewInfo(undefined);
      setModalError(undefined);

      try {
        const uploaded = await uploadDatasource(file, file.name);
        setUploadedDatasourceId(uploaded.id);
        setPreviewInfo('Файл загружен. Загружаем предпросмотр...');

        const nextConfig = buildNextNodeConfig(config, uploaded.id);
        setConfig(nextConfig);

        await saveNodeConfig(editingNode.id, nextConfig);
        await fetchSourcePreview(uploaded.id);
        await loadAvailableColumns(editingNode.id);
        setSelectedFile(null);
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
      setConfig,
      setModalError,
      setPreviewInfo,
      setSelectedFile,
      setUploadedDatasourceId,
    ]
  );

  return {
    fetchSourcePreview,
    onSaveNodeConfig,
    onFileChange,
  };
}
