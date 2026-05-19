import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './index.module.scss';
import type { SourceFileConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';

export function SourceFileConfigEditor({
  selectedFile,
  selectedFileName,
  sourceFileMetadata,
  selectedSheetName,
  excelSheetNames,
  onFileChange,
  onSheetNameChange,
}: SourceFileConfigEditorProps) {
  const currentFileName = selectedFile?.name ?? selectedFileName;
  const sheetNames =
    sourceFileMetadata?.sheets_metadata.map((sheet) => sheet.sheet_name) ?? excelSheetNames;
  const sheetOptions: SelectOption[] = sheetNames.map((sheetName) => ({
    value: sheetName,
    label: sheetName,
  }));

  const isCsvFile = currentFileName?.toLowerCase().endsWith('.csv') ?? false;
  const selectedOption = sheetOptions.find((option) => option.value === selectedSheetName) ?? null;

  const showSheetSelector = !isCsvFile && sheetOptions.length > 1;

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

      {showSheetSelector ? (
        <div className={styles.sheetSelector}>
          <label className={styles.configLabel}>Лист Excel</label>
          <CustomSelect
            options={sheetOptions}
            value={selectedOption}
            placeholder="Выберите лист..."
            isClearable={false}
            isSearchable={false}
            onChange={(option) => {
              const nextSheetName = (option as SelectOption)?.value;
              if (!nextSheetName) {
                return;
              }
              onSheetNameChange(nextSheetName);
            }}
          />
        </div>
      ) : !isCsvFile && sheetOptions.length === 1 ? (
        <p className={styles.muted}>Найден один лист Excel. Он будет выбран автоматически.</p>
      ) : null}
    </div>
  );
}
