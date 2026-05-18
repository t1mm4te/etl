import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './index.module.scss';
import type { SourceFileConfigEditorProps } from '../types';

export function SourceFileConfigEditor({
  selectedFile,
  selectedFileName,
  selectedSheetName,
  excelSheetNames,
  onFileChange,
  onSheetNameChange,
}: SourceFileConfigEditorProps) {
  const currentFileName = selectedFile?.name ?? selectedFileName;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      // File is uploaded as-is; sheet detection and selection is handled by backend.
      onFileChange(file, undefined);
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
          {isDragActive ? 'Отпустите файл здесь' : 'Перетащите файл сюда или нажмите для выбора'}
        </p>
      </div>

      {currentFileName ? <p className={styles.muted}>Выбран файл: {currentFileName}</p> : null}

      {excelSheetNames.length > 0 ? (
        <div className={styles.sheetSelector}>
          <label htmlFor="sheet-select" className={styles.configLabel}>
            Лист Excel
          </label>
          <select
            id="sheet-select"
            value={selectedSheetName || ''}
            onChange={(e) => onSheetNameChange(e.target.value)}
            className={styles.select}
          >
            {excelSheetNames.map((sheetName) => (
              <option key={sheetName} value={sheetName}>
                {sheetName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
