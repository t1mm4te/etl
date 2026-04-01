import type { ChangeEvent } from 'react';
import type { Node as ApiNode, PreviewResponse } from '../../../api/types';
import { Button } from '../../Button';
import styles from './index.module.scss';

type NodeConfigModalProps = {
  node: ApiNode;
  configText: string;
  datasourceId: string;
  selectedFile: File | null;
  preview: PreviewResponse | null;
  previewInfo?: string;
  modalError?: string;
  isSourceNode: boolean;
  onClose: () => void;
  onConfigTextChange: (value: string) => void;
  onDatasourceIdChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onUploadFile: () => void;
  onFetchPreview: () => void;
  onSaveConfig: () => void;
};

export function NodeConfigModal({
  node,
  configText,
  datasourceId,
  selectedFile,
  preview,
  previewInfo,
  modalError,
  isSourceNode,
  onClose,
  onConfigTextChange,
  onDatasourceIdChange,
  onFileChange,
  onUploadFile,
  onFetchPreview,
  onSaveConfig,
}: NodeConfigModalProps) {
  const fileName = selectedFile?.name;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{node.label}</h3>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className={styles.muted}>Тип операции: {node.operation_type}</p>

        {isSourceNode ? (
          <div className={styles.sourceTools}>
            <label>
              datasource_id
              <input
                value={datasourceId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onDatasourceIdChange(event.target.value.trim())
                }
                placeholder="UUID источника"
              />
            </label>

            <label>
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

            <div className={styles.modalActions}>
              <Button type="button" color="white" onClick={onUploadFile}>
                Загрузить файл
              </Button>
              <Button type="button" color="white" onClick={onFetchPreview}>
                Проверить предпросмотр
              </Button>
            </div>

            {previewInfo ? <p className={styles.muted}>{previewInfo}</p> : null}

            {preview ? (
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
            ) : null}
          </div>
        ) : null}

        <label className={styles.configLabel}>
          Конфигурация (JSON)
          <textarea
            rows={10}
            value={configText}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onConfigTextChange(event.target.value)
            }
          />
        </label>

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
  );
}
