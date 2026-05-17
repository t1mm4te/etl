import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../api/types';
import { Button } from '../../Button';
import { SourceDbConfigEditor, SourceFileConfigEditor, TransformConfigEditor } from './forms';
import { PreviewTable } from '../PreviewTable';
import styles from './index.module.scss';

type NodeKind = 'source' | 'transform' | 'sink';

type NodeConfigModalProps = {
  modalState: {
    node: ApiNode;
    nodeKind: NodeKind;
    hasIncomingData: boolean;
    config: NodeConfig;
    selectedFile: File | null;
    selectedFileName?: string;
    selectedSheetName?: string;
    excelSheetNames: string[];
    previewRowLimit: number;
    availableColumns: string[];
    availableColumnsByPort?: Record<string, string[]>;
    inputNodeLabelsByPort?: Record<string, string>;
    previewInfo?: string;
    modalError?: string;
  };
  previewState: {
    inputPreview: PreviewResponse | null;
    leftInputPreview: PreviewResponse | null;
    rightInputPreview: PreviewResponse | null;
    resultPreview: PreviewResponse | null;
    isPreviewLoading: boolean;
    activePreviewTab: 'input' | 'left_input' | 'right_input' | 'result';
  };
  modalActions: {
    onClose: () => void;
    onConfigChange: (value: NodeConfig) => void;
    onFileChange: (file: File | null, sheetName?: string) => void;
    onSaveConfig: () => void;
  };
  previewActions: {
    onActivePreviewTabChange: (value: 'input' | 'left_input' | 'right_input' | 'result') => void;
    onApplyPreview: () => void;
  };
  previewCallbacks?: {
    onSetExcelSheetNames: (names: string[]) => void;
    onSetSelectedSheetName: (name: string) => void;
    onSetPreviewRowLimit: (limit: number) => void;
  };
  onSheetNameChange?: (sheetName: string) => Promise<void> | void;
  onPreviewRowLimitChange?: (limit?: number) => Promise<void>;
};
export function NodeConfigModal({
  modalState,
  previewState,
  modalActions,
  previewActions,
  previewCallbacks,
  onSheetNameChange,
  onPreviewRowLimitChange,
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
    previewRowLimit,
    availableColumns,
    availableColumnsByPort,
    inputNodeLabelsByPort,
    previewInfo,
    modalError,
  } = modalState;
  const {
    inputPreview,
    leftInputPreview,
    rightInputPreview,
    resultPreview,
    isPreviewLoading,
    activePreviewTab,
  } = previewState;
  const { onClose, onConfigChange, onFileChange, onSaveConfig } = modalActions;
  const { onActivePreviewTabChange, onApplyPreview } = previewActions;
  const datasourceId = typeof config.datasource_id === 'string' ? config.datasource_id : undefined;

  const isSourceFile = node.operation_type === 'source_file';
  const isSourceDb = node.operation_type === 'source_db';
  const isJoin = node.operation_type === 'join';

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

              <section className={styles.previewPanel}>
                {isPreviewLoading ? (
                  <p className={styles.muted}>Загружаем предпросмотр...</p>
                ) : null}

                {resultPreview ? (
                  <>
                    <div className={styles.metadataRow}>
                      <p className={styles.metadata}>
                        Всего строк: {resultPreview.total_rows} | Столбцов:{' '}
                        {resultPreview.columns.length}
                      </p>
                      <select
                        value={previewRowLimit}
                        onChange={(e) => {
                          const limit = Number(e.target.value);
                          previewCallbacks?.onSetPreviewRowLimit(limit);
                          void onPreviewRowLimitChange?.(limit);
                        }}
                        className={styles.rowLimitSelect}
                      >
                        <option value={10}>10 строк</option>
                        <option value={25}>25 строк</option>
                        <option value={50}>50 строк</option>
                        <option value={100}>100 строк</option>
                        <option value={500}>500 строк</option>
                      </select>
                    </div>
                    <div className={styles.tabRow}>
                      <button type="button" className={styles.tabActive}>
                        Результат узла
                      </button>
                    </div>
                    <PreviewTable preview={resultPreview} />
                  </>
                ) : (
                  <p className={styles.muted}>Предпросмотр источника пока недоступен.</p>
                )}
              </section>
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

                <Button type="button" onClick={onApplyPreview}>
                  Применить / обновить результат
                </Button>
              </aside>

              <section className={styles.previewPanel}>
                {!hasIncomingData ? (
                  <p className={styles.muted}>
                    Нет входных данных. Подведите стрелку к входу узла.
                  </p>
                ) : (
                  <>
                    {(inputPreview || leftInputPreview || rightInputPreview || resultPreview) && (
                      <div className={styles.metadataRow}>
                        <p className={styles.metadata}>
                          {activePreviewTab === 'input'
                            ? `Всего строк: ${inputPreview?.total_rows ?? 0} | Столбцов: ${inputPreview?.columns.length ?? 0}`
                            : activePreviewTab === 'left_input'
                              ? `Всего строк: ${leftInputPreview?.total_rows ?? 0} | Столбцов: ${leftInputPreview?.columns.length ?? 0}`
                              : activePreviewTab === 'right_input'
                                ? `Всего строк: ${rightInputPreview?.total_rows ?? 0} | Столбцов: ${rightInputPreview?.columns.length ?? 0}`
                                : `Всего строк: ${resultPreview?.total_rows ?? 0} | Столбцов: ${resultPreview?.columns.length ?? 0}`}
                        </p>
                        <select
                          value={previewRowLimit}
                          onChange={(e) => {
                            const limit = Number(e.target.value);
                            previewCallbacks?.onSetPreviewRowLimit(limit);
                            void onPreviewRowLimitChange?.(limit);
                          }}
                          className={styles.rowLimitSelect}
                        >
                          <option value={10}>10 строк</option>
                          <option value={25}>25 строк</option>
                          <option value={50}>50 строк</option>
                          <option value={100}>100 строк</option>
                          <option value={500}>500 строк</option>
                        </select>
                      </div>
                    )}

                    <div className={styles.tabRow}>
                      <button
                        type="button"
                        className={activePreviewTab === 'result' ? styles.tabActive : styles.tab}
                        onClick={() => onActivePreviewTabChange('result')}
                      >
                        Результат узла
                      </button>

                      {isJoin ? (
                        <>
                          <button
                            type="button"
                            className={
                              activePreviewTab === 'left_input' ? styles.tabActive : styles.tab
                            }
                            onClick={() => onActivePreviewTabChange('left_input')}
                          >
                            {inputNodeLabelsByPort?.left ?? inputNodeLabelsByPort?.main ?? 'Вход 1'}
                          </button>
                          <button
                            type="button"
                            className={
                              activePreviewTab === 'right_input' ? styles.tabActive : styles.tab
                            }
                            onClick={() => onActivePreviewTabChange('right_input')}
                          >
                            {inputNodeLabelsByPort?.right ?? 'Вход 2'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={activePreviewTab === 'input' ? styles.tabActive : styles.tab}
                          onClick={() => onActivePreviewTabChange('input')}
                        >
                          Входные данные
                        </button>
                      )}
                    </div>

                    {isPreviewLoading ? (
                      <p className={styles.muted}>Загружаем предпросмотр...</p>
                    ) : null}

                    {activePreviewTab === 'input' ? (
                      inputPreview ? (
                        <PreviewTable preview={inputPreview} />
                      ) : (
                        <p className={styles.muted}>Входной предпросмотр недоступен.</p>
                      )
                    ) : activePreviewTab === 'left_input' ? (
                      leftInputPreview ? (
                        <PreviewTable preview={leftInputPreview} />
                      ) : (
                        <p className={styles.muted}>Предпросмотр первого входа недоступен.</p>
                      )
                    ) : activePreviewTab === 'right_input' ? (
                      rightInputPreview ? (
                        <PreviewTable preview={rightInputPreview} />
                      ) : (
                        <p className={styles.muted}>Предпросмотр второго входа недоступен.</p>
                      )
                    ) : resultPreview ? (
                      <PreviewTable preview={resultPreview} />
                    ) : (
                      <p className={styles.muted}>
                        Результат пока недоступен. Нажмите «Применить».
                      </p>
                    )}
                  </>
                )}
              </section>
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

                <Button type="button" color="white" onClick={onApplyPreview}>
                  Обновить финальный результат
                </Button>
              </aside>

              <section className={styles.previewPanel}>
                {isPreviewLoading ? (
                  <p className={styles.muted}>Загружаем предпросмотр...</p>
                ) : null}
                {resultPreview ? (
                  <>
                    <div className={styles.metadataRow}>
                      <p className={styles.metadata}>
                        Всего строк: {resultPreview.total_rows} | Столбцов:{' '}
                        {resultPreview.columns.length}
                      </p>
                      <select
                        value={previewRowLimit}
                        onChange={(e) => {
                          const limit = Number(e.target.value);
                          previewCallbacks?.onSetPreviewRowLimit(limit);
                          void onPreviewRowLimitChange?.(limit);
                        }}
                        className={styles.rowLimitSelect}
                      >
                        <option value={10}>10 строк</option>
                        <option value={25}>25 строк</option>
                        <option value={50}>50 строк</option>
                        <option value={100}>100 строк</option>
                        <option value={500}>500 строк</option>
                      </select>
                    </div>
                    <PreviewTable preview={resultPreview} />
                  </>
                ) : (
                  <p className={styles.muted}>Финальный предпросмотр пока недоступен.</p>
                )}
              </section>
            </div>
          ) : null}

          {previewInfo ? <p className={styles.muted}>{previewInfo}</p> : null}
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
