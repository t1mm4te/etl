import { useCallback } from 'react';
import { getDatasourceDetail, previewDatasource, uploadDatasource } from '../../../api/pipelines';
import type { Node as ApiNode, NodeConfig } from '../../../api/types';
import { extractError } from '../../../lib/extractError';
import { useNodeConfigModalActions } from '../../../store/nodeConfigModalStore';
import { buildNextNodeConfig } from './nodePreviewUtils';

type UseSourceNodePreviewActionsParams = {
  editingNode: ApiNode | null;
  config: NodeConfig;
  uploadedDatasourceId: string;
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
  saveNodeConfig,
  loadAvailableColumns,
  closeModal,
}: UseSourceNodePreviewActionsParams) {
  const {
    setConfig,
    setSelectedFile,
    setSelectedFileName,
    setUploadedDatasourceId,
    setInputPreview,
    setLeftInputPreview,
    setRightInputPreview,
    setResultPreview,
    setIsPreviewLoading,
    setPreviewInfo,
    setModalError,
  } = useNodeConfigModalActions();

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
          setSelectedFileName(datasource.original_filename || undefined);
          setResultPreview(null);
          setPreviewInfo(`Источник в статусе ${datasource.status}. Данные ещё обрабатываются.`);
          return;
        }

        setSelectedFileName(datasource.original_filename || undefined);
        const previewData = await previewDatasource(datasourceId, 10);
        setResultPreview(previewData);
      } catch (error) {
        setModalError(extractError(error, 'Не удалось получить предпросмотр'));
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      clearSourcePreviews,
      setIsPreviewLoading,
      setModalError,
      setPreviewInfo,
      setResultPreview,
      setSelectedFileName,
    ]
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
      setSelectedFileName(file.name);
      setPreviewInfo(undefined);
      setModalError(undefined);

      try {
        const uploaded = await uploadDatasource(file, file.name);
        setUploadedDatasourceId(uploaded.id);
        setPreviewInfo('Файл загружен. Загружаем предпросмотр...');

        const nextConfig = buildNextNodeConfig(config, uploaded.id);
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
      setConfig,
      setModalError,
      setPreviewInfo,
      setSelectedFile,
      setSelectedFileName,
      setUploadedDatasourceId,
    ]
  );

  return {
    fetchSourcePreview,
    onSaveNodeConfig,
    onFileChange,
  };
}
