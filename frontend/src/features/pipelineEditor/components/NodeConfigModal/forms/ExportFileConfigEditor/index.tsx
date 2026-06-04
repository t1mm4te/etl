import styles from './index.module.scss';
import type { LoadConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Input } from '../../../../../../shared/ui/Input';
import { useState } from 'react';

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV (.csv)', extension: '.csv' },
  { value: 'xlsx', label: 'Excel (.xlsx)', extension: '.xlsx' },
  { value: 'parquet', label: 'Parquet (.parquet)', extension: '.parquet' },
] as const;

const DEFAULT_FILENAME = 'results_file.csv';

export function ExportFileConfigEditor({ config, onChange }: LoadConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;

  const currentFormat = typeof typedConfig.format === 'string' ? typedConfig.format : 'csv';

  // Инициализируем состояние один раз при монтировании
  const [filename, setFilename] = useState(() =>
    typeof typedConfig.filename === 'string' ? typedConfig.filename : DEFAULT_FILENAME
  );

  // При смене формата — меняем расширение в имени файла
  const handleFormatChange = (newFormat: string) => {
    const newExtension = EXPORT_FORMATS.find((f) => f.value === newFormat)?.extension ?? '.csv';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, ''); // удаляем старое расширение
    const newFilename = nameWithoutExt + newExtension;

    setFilename(newFilename);
    onChange({
      ...typedConfig,
      format: newFormat,
      filename: newFilename,
    });
  };

  const handleFilenameChange = (newFilename: string) => {
    setFilename(newFilename);
    onChange({
      ...typedConfig,
      format: currentFormat,
      filename: newFilename,
    });
  };

  const options: SelectOption[] = EXPORT_FORMATS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    <div className={styles.root}>
      <label className={styles.configLabel}>
        Формат файла
        <CustomSelect
          options={options}
          value={options.find((item) => item.value === currentFormat) ?? options[0]}
          onChange={(option) => {
            if (option && 'value' in option) {
              handleFormatChange(option.value);
            }
          }}
          isSearchable={false}
          isClearable={false}
        />
      </label>

      <label className={styles.configLabel}>
        Имя файла
        <Input
          value={filename}
          placeholder={DEFAULT_FILENAME}
          onChange={(event) => handleFilenameChange(event.target.value)}
        />
      </label>
      <p className={styles.text}>
        Сохраните настройки файла и запустите пайплайн. Итоговый файл будет отправлен вам на почту
        после успешного запуска пайплайна.
      </p>
    </div>
  );
}
