import type { ChangeEvent } from 'react';
import styles from './index.module.scss';
import type { SourceFileConfigEditorProps } from '../types';

export function SourceFileConfigEditor({
  selectedFile,
  onFileChange,
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
    </>
  );
}
