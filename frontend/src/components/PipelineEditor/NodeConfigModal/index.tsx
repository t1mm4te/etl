import type { Node as ApiNode, NodeConfig, PreviewResponse } from '../../../api/types';
import { Button } from '../../Button';
import { SourceDbConfigEditor, SourceFileConfigEditor, TransformConfigEditor } from './forms';
import styles from './index.module.scss';

type NodeKind = 'source' | 'transform' | 'sink';

type NodeConfigModalProps = {
  node: ApiNode;
  nodeKind: NodeKind;
  hasIncomingData: boolean;
  config: NodeConfig;
  selectedFile: File | null;
  availableColumns: string[];
  availableColumnsByPort?: Record<string, string[]>;
  inputNodeLabelsByPort?: Record<string, string>;
  inputPreview: PreviewResponse | null;
  leftInputPreview: PreviewResponse | null;
  rightInputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
  isPreviewLoading: boolean;
  activePreviewTab: 'input' | 'left_input' | 'right_input' | 'result';
  previewInfo?: string;
  modalError?: string;
  onClose: () => void;
  onConfigChange: (value: NodeConfig) => void;
  onActivePreviewTabChange: (value: 'input' | 'left_input' | 'right_input' | 'result') => void;
  onFileChange: (file: File | null) => void;
  onUploadFile: () => void;
  onRefreshSourcePreview: () => void;
  onApplyPreview: () => void;
  onSaveConfig: () => void;
};

function PreviewTable({ preview }: { preview: PreviewResponse }) {
  return (
    <div className={styles.previewTableWrapper}>
      <table>
        <thead>
          <tr>
            {preview.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.data.map((row, index) => (
            <tr key={index}>
              {preview.columns.map((column) => (
                <td key={`${index}-${column}`}>{String(row[column] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NodeConfigModal({
  node,
  nodeKind,
  hasIncomingData,
  config,
  selectedFile,
  availableColumns,
  availableColumnsByPort,
  inputNodeLabelsByPort,
  inputPreview,
  leftInputPreview,
  rightInputPreview,
  resultPreview,
  isPreviewLoading,
  activePreviewTab,
  previewInfo,
  modalError,
  onClose,
  onConfigChange,
  onActivePreviewTabChange,
  onFileChange,
  onUploadFile,
  onRefreshSourcePreview,
  onApplyPreview,
  onSaveConfig,
}: NodeConfigModalProps) {
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
                    datasourceId={datasourceId}
                    onFileChange={onFileChange}
                    onUploadFile={onUploadFile}
                    onRefreshSourcePreview={onRefreshSourcePreview}
                  />
                ) : null}

                {isSourceDb ? (
                  <SourceDbConfigEditor
                    datasourceId={datasourceId}
                    onRefreshSourcePreview={onRefreshSourcePreview}
                  />
                ) : null}
              </aside>

              <section className={styles.previewPanel}>
                {isPreviewLoading ? (
                  <p className={styles.muted}>Загружаем предпросмотр...</p>
                ) : null}
                <div className={styles.tabRow}>
                  <button type="button" className={styles.tabActive}>
                    Результат узла
                  </button>
                </div>

                {resultPreview ? (
                  <PreviewTable preview={resultPreview} />
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
                  <PreviewTable preview={resultPreview} />
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
