import type { ChangeEvent } from 'react';
import { Button } from '../../../../Button';
import styles from './index.module.scss';
import type { SourceFileConfigEditorProps } from '../types';

export function SourceFileConfigEditor({
  selectedFile,
  datasourceId,
  onFileChange,
  onUploadFile,
  onRefreshSourcePreview,
}: SourceFileConfigEditorProps) {
  return (
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

      {selectedFile ? <p className={styles.muted}>Выбран файл: {selectedFile.name}</p> : null}
      {datasourceId ? <p className={styles.muted}>DataSource ID: {datasourceId}</p> : null}

      <Button type="button" color="white" onClick={onUploadFile}>
        Загрузить файл
      </Button>
      <Button type="button" color="white" onClick={onRefreshSourcePreview}>
        Обновить предпросмотр
      </Button>
    </>
  );
}
