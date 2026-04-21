import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './index.module.scss';
import type { SourceFileConfigEditorProps } from '../types';

export function SourceFileConfigEditor({
  selectedFile,
  onFileChange,
}: SourceFileConfigEditorProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileChange(acceptedFiles[0] ?? null);
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  return (
    <div className={styles.root}>
      <p className={styles.configLabel}>Файл CSV/XLSX</p>

      <div
        {...getRootProps()}
        className={styles.dropzone}
        data-active={isDragActive ? 'true' : 'false'}
      >
        <input {...getInputProps()} />
        <p className={styles.dropzoneText}>
          {isDragActive
            ? 'Отпустите файл здесь'
            : 'Перетащите файл сюда или нажмите для выбора'}
        </p>
      </div>

      {selectedFile ? <p className={styles.muted}>Выбран файл: {selectedFile.name}</p> : null}

      {selectedFile ? (
        <button type="button" className={styles.clearButton} onClick={() => onFileChange(null)}>
          Убрать файл
        </button>
      ) : null}
    </div>
  );
}
