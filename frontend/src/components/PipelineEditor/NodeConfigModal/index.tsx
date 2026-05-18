import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../shared/api/types';
import { Button } from '../../../shared/ui/Button';
import { SourceDbConfigEditor, SourceFileConfigEditor, TransformConfigEditor } from './forms';
import { PreviewPanel } from '../PreviewPanel';
import styles from './index.module.scss';

type NodeKind = 'source' | 'transform' | 'sink';

type NodeConfigModalProps = {
  modalState: {
    node: ApiNode | null;
    nodeKind: NodeKind;
    hasIncomingData: boolean;
    config: NodeConfig;
    selectedFile: File | null;
    selectedFileName?: string;
    selectedSheetName?: string;
    excelSheetNames: string[];
    availableColumns: string[];
    availableColumnsByPort?: Record<string, string[]>;
    inputNodeLabelsByPort?: Record<string, string>;
    modalError?: string;
    previewRowLimit: number;
  };
  previewState: {
    inputPreview: PreviewResponse | null;
    leftInputPreview: PreviewResponse | null;
    rightInputPreview: PreviewResponse | null;
    resultPreview: PreviewResponse | null;
    isPreviewLoading: boolean;
  };
  modalActions: {
    onClose: () => void;
    onConfigChange: (value: NodeConfig) => void;
    onFileChange: (file: File | null, sheetName?: string) => void;
    onSaveConfig: () => void;
    onPreviewRowLimitChange: (value: number) => void;
  };
  previewActions: {
    onApplyPreview: () => void;
  };
  previewCallbacks?: {
    onSetExcelSheetNames: (names: string[]) => void;
    onSetSelectedSheetName: (name: string) => void;
  };
  onSheetNameChange?: (sheetName: string) => Promise<void> | void;
};
export function NodeConfigModal({
  modalState,
  previewState,
  modalActions,
  previewActions,
  previewCallbacks,
  onSheetNameChange,
}: NodeConfigModalProps) {
  const {
    node,
    nodeKind,
    hasIncomingData,
    config,
    selectedFile,
    selectedFileName,
    selectedSheetName,
    excelSheetNames,
    availableColumns,
    availableColumnsByPort,
    inputNodeLabelsByPort,
    modalError,
    previewRowLimit,
  } = modalState;
  const { onClose, onConfigChange, onFileChange, onSaveConfig, onPreviewRowLimitChange } =
    modalActions;

  if (!node) {
    return null;
  }

  const datasourceId = typeof config.datasource_id === 'string' ? config.datasource_id : undefined;

  const isSourceFile = node.operation_type === 'source_file';
  const isSourceDb = node.operation_type === 'source_db';

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{node.label}</h3>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalContent}>
          {nodeKind === 'source' ? (
            <div className={styles.transformLayout}>
              <aside className={styles.configPanel}>
                {isSourceFile ? (
                  <SourceFileConfigEditor
                    selectedFile={selectedFile}
                    selectedFileName={selectedFileName}
                    selectedSheetName={selectedSheetName}
                    excelSheetNames={excelSheetNames}
                    onFileChange={onFileChange}
                    onSheetNameChange={(sheetName) => {
                      previewCallbacks?.onSetSelectedSheetName(sheetName);
                      void onSheetNameChange?.(sheetName);
                    }}
                  />
                ) : null}

                {isSourceDb ? <SourceDbConfigEditor datasourceId={datasourceId} /> : null}
              </aside>

              <PreviewPanel
                previewState={previewState}
                nodeKind="source"
                previewRowLimit={previewRowLimit}
                onPreviewRowLimitChange={onPreviewRowLimitChange}
              />
            </div>
          ) : null}

          {nodeKind === 'transform' ? (
            <div className={styles.transformLayout}>
              <aside className={styles.configPanel}>
                <TransformConfigEditor
                  operationType={node.operation_type}
                  config={config}
                  availableColumns={availableColumns}
                  availableColumnsByPort={availableColumnsByPort}
                  inputNodeLabelsByPort={inputNodeLabelsByPort}
                  onConfigChange={onConfigChange}
                />

                <Button type="button" onClick={previewActions.onApplyPreview}>
                  Применить / обновить результат
                </Button>
              </aside>

              <PreviewPanel
                previewState={previewState}
                nodeKind="transform"
                hasIncomingData={hasIncomingData}
                isJoin={node.operation_type === 'join'}
                inputNodeLabelsByPort={inputNodeLabelsByPort}
                previewRowLimit={previewRowLimit}
                onPreviewRowLimitChange={onPreviewRowLimitChange}
              />
            </div>
          ) : null}

          {nodeKind === 'sink' ? (
            <div className={styles.transformLayout}>
              <aside className={styles.configPanel}>
                <TransformConfigEditor
                  operationType={node.operation_type}
                  config={config}
                  availableColumns={availableColumns}
                  availableColumnsByPort={availableColumnsByPort}
                  inputNodeLabelsByPort={inputNodeLabelsByPort}
                  onConfigChange={onConfigChange}
                />

                <Button type="button" color="white" onClick={previewActions.onApplyPreview}>
                  Обновить финальный результат
                </Button>
              </aside>

              <PreviewPanel
                previewState={previewState}
                nodeKind="sink"
                hasIncomingData={hasIncomingData}
                previewRowLimit={previewRowLimit}
                onPreviewRowLimitChange={onPreviewRowLimitChange}
              />
            </div>
          ) : null}

          {modalError ? <p className={styles.error}>{modalError}</p> : null}

          <div className={styles.modalActions}>
            <Button type="button" color="white" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" onClick={onSaveConfig}>
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
