import type { ChangeEvent } from 'react';
import type { Node as ApiNode, PreviewResponse } from '../../../api/types';
import { Button } from '../../Button';
import styles from './index.module.scss';

type NodeKind = 'source' | 'transform' | 'sink';

type NodeConfigModalProps = {
  node: ApiNode;
  nodeKind: NodeKind;
  hasIncomingData: boolean;
  configText: string;
  selectedFile: File | null;
  inputPreview: PreviewResponse | null;
  resultPreview: PreviewResponse | null;
  isPreviewLoading: boolean;
  activePreviewTab: 'input' | 'result';
  previewInfo?: string;
  modalError?: string;
  onClose: () => void;
  onConfigTextChange: (value: string) => void;
  onActivePreviewTabChange: (value: 'input' | 'result') => void;
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
  configText,
  selectedFile,
  inputPreview,
  resultPreview,
  isPreviewLoading,
  activePreviewTab,
  previewInfo,
  modalError,
  onClose,
  onConfigTextChange,
  onActivePreviewTabChange,
  onFileChange,
  onUploadFile,
  onRefreshSourcePreview,
  onApplyPreview,
  onSaveConfig,
}: NodeConfigModalProps) {
  const fileName = selectedFile?.name;
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
                  <>
                    <label className={styles.configLabel}>
                      Файл CSV/XLSX
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          onFileChange(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>

                    {fileName ? <p className={styles.muted}>Выбран файл: {fileName}</p> : null}

                    <Button type="button" color="white" onClick={onUploadFile}>
                      Загрузить файл
                    </Button>
                    <Button type="button" color="white" onClick={onRefreshSourcePreview}>
                      Обновить предпросмотр
                    </Button>
                  </>
                ) : null}

                {isSourceDb ? (
                  <>
                    <Button type="button" color="white" disabled>
                      Подключить БД (скоро)
                    </Button>
                    <Button type="button" color="white" onClick={onRefreshSourcePreview}>
                      Обновить предпросмотр
                    </Button>
                  </>
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
                <label className={styles.configLabel}>
                  Настройки узла (JSON)
                  <textarea
                    rows={10}
                    value={configText}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      onConfigTextChange(event.target.value)
                    }
                  />
                </label>
                <Button type="button" color="white" onClick={onApplyPreview}>
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
                      <button
                        type="button"
                        className={activePreviewTab === 'input' ? styles.tabActive : styles.tab}
                        onClick={() => onActivePreviewTabChange('input')}
                      >
                        Входные данные
                      </button>
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
                <label className={styles.configLabel}>
                  Дополнительные настройки (JSON)
                  <textarea
                    rows={10}
                    value={configText}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      onConfigTextChange(event.target.value)
                    }
                  />
                </label>
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
