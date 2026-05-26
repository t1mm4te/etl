import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './index.module.scss';
import type { SourceFileConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { getFileExtension } from '../../../../utils/sourceNodePreviewUtils';

export function SourceFileConfigEditor({
  selectedFile,
  selectedFileName,
  selectedSheetName,
  excelSheetNames,
  isUploading = false,
  uploadProgress = null,
  onFileChange,
  onSheetNameChange,
}: SourceFileConfigEditorProps) {
  const currentFileName = selectedFile?.name ?? selectedFileName;
  const fileExtension = currentFileName ? getFileExtension(currentFileName) : '';
  const sheetOptions: SelectOption[] = excelSheetNames.map((sheetName) => ({
    value: sheetName,
    label: sheetName,
  }));

  const isExcelFile = fileExtension === 'xls' || fileExtension === 'xlsx';

  const selectedOption = sheetOptions.find((option) => option.value === selectedSheetName) ?? null;

  const showSheetSelector = isExcelFile && sheetOptions.length > 1;

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
    disabled: isUploading,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  return (
    <div className={styles.root}>
      <p className={styles.configLabel}>Доступные форматы: csv/xlsx</p>
      <div
        {...getRootProps()}
        className={styles.dropzone}
        data-active={isDragActive ? 'true' : 'false'}
        data-uploading={isUploading ? 'true' : 'false'}
      >
        <input {...getInputProps()} />
        <p className={styles.dropzoneText}>
          {isUploading
            ? 'Загружаем файл...'
            : isDragActive
              ? 'Отпустите файл здесь'
              : 'Перетащите файл сюда или нажмите для выбора'}
        </p>
      </div>

      {isUploading ? (
        <div className={styles.progressBlock}>
          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={styles.progressFill}
              data-complete={uploadProgress === 100 ? 'true' : 'false'}
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
          <p className={styles.loading}>
            {uploadProgress !== null && uploadProgress < 100
              ? `Загружаем файл... ${uploadProgress}%`
              : 'Файл передан. Ждём ответ сервера...'}
          </p>
        </div>
      ) : null}

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
            isDisabled={isUploading}
            onChange={(option) => {
              const nextSheetName = (option as SelectOption)?.value;
              if (!nextSheetName) {
                return;
              }
              onSheetNameChange(nextSheetName);
            }}
          />
        </div>
      ) : isExcelFile && sheetOptions.length === 1 ? (
        <p className={styles.muted}>Найден один лист Excel. Он будет выбран автоматически.</p>
      ) : null}
    </div>
  );
}
