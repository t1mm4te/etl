import { useCallback, useMemo, useState } from 'react';
import { getDatasourceDetail, previewDatasource, uploadDatasource } from '../../../api/pipelines';
import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../api/types';
import { extractError } from '../../../lib/extractError';

function parseConfigText(configText: string): NodeConfig {
  const parsed = JSON.parse(configText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Конфиг должен быть JSON-объектом');
  }
  return parsed as NodeConfig;
}

type UseNodeConfigModalStateParams = {
  nodes: ApiNode[] | undefined;
  saveNodeConfig: (nodeId: string, config: NodeConfig) => Promise<void>;
};

export function useNodeConfigModalState({ nodes, saveNodeConfig }: UseNodeConfigModalStateParams) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [configText, setConfigText] = useState('{}');
  const [modalError, setModalError] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDatasourceId, setUploadedDatasourceId] = useState<string>('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewInfo, setPreviewInfo] = useState<string>();

  const editingNode = useMemo(
    () => nodes?.find((node) => node.id === editingNodeId) ?? null,
    [editingNodeId, nodes]
  );

  const openNodeModal = useCallback(
    (nodeId: string) => {
      const node = nodes?.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      setEditingNodeId(node.id);
      setConfigText(JSON.stringify(node.config ?? {}, null, 2));
      setModalError(undefined);
      setPreview(null);
      setPreviewInfo(undefined);
      setSelectedFile(null);

      const cfg = node.config ?? {};
      const currentDatasourceId = typeof cfg.datasource_id === 'string' ? cfg.datasource_id : '';
      setUploadedDatasourceId(currentDatasourceId);
    },
    [nodes]
  );

  const closeModal = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const onSaveNodeConfig = useCallback(async () => {
    if (!editingNode) {
      return;
    }

    setModalError(undefined);

    try {
      const parsedConfig = parseConfigText(configText);
      if (uploadedDatasourceId) {
        parsedConfig.datasource_id = uploadedDatasourceId;
      }

      await saveNodeConfig(editingNode.id, parsedConfig);
      closeModal();
    } catch (error) {
      setModalError(extractError(error, 'Не удалось сохранить конфигурацию ноды'));
    }
  }, [closeModal, configText, editingNode, saveNodeConfig, uploadedDatasourceId]);

  const onUploadFile = useCallback(async () => {
    if (!selectedFile || !editingNode) {
      return;
    }

    setPreviewInfo(undefined);
    setModalError(undefined);

    try {
      const uploaded = await uploadDatasource(selectedFile, selectedFile.name);
      setUploadedDatasourceId(uploaded.id);
      setPreviewInfo(
        'Файл загружен. Если статус не ready, подождите и нажмите «Проверить предпросмотр».'
      );

      const parsedConfig = parseConfigText(configText);
      parsedConfig.datasource_id = uploaded.id;
      setConfigText(JSON.stringify(parsedConfig, null, 2));

      await saveNodeConfig(editingNode.id, parsedConfig);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось загрузить файл'));
    }
  }, [configText, editingNode, saveNodeConfig, selectedFile]);

  const onFetchPreview = useCallback(async () => {
    if (!uploadedDatasourceId) {
      setModalError('Сначала загрузите файл');
      return;
    }

    setPreviewInfo(undefined);
    setModalError(undefined);

    try {
      const datasource = await getDatasourceDetail(uploadedDatasourceId);
      if (datasource.status !== 'ready') {
        setPreview(null);
        setPreviewInfo(`Источник в статусе ${datasource.status}. Данные ещё обрабатываются.`);
        return;
      }

      const previewData = await previewDatasource(uploadedDatasourceId, 10);
      setPreview(previewData);
    } catch (error) {
      setModalError(extractError(error, 'Не удалось получить предпросмотр'));
    }
  }, [uploadedDatasourceId]);

  return {
    editingNode,
    configText,
    modalError,
    onFetchPreview,
    onSaveNodeConfig,
    onUploadFile,
    openNodeModal,
    closeModal,
    preview,
    previewInfo,
    selectedFile,
    setConfigText,
    setSelectedFile,
  };
}
