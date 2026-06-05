import styles from './index.module.scss';
import type { LoadConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Input } from '../../../../../../shared/ui/Input';
import { useState, useEffect } from 'react';

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV (.csv)', extension: '.csv' },
  { value: 'xlsx', label: 'Excel (.xlsx)', extension: '.xlsx' },
  { value: 'parquet', label: 'Parquet (.parquet)', extension: '.parquet' },
] as const;

const DEFAULT_FILENAME = 'results_file.csv';

export function ExportFileConfigEditor({ config, onChange }: LoadConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;

  const currentFormat = typeof typedConfig.format === 'string' ? typedConfig.format : 'csv';

  const [filename, setFilename] = useState(DEFAULT_FILENAME);

  // Синхронизируем filename с config при изменении config
  useEffect(() => {
    const configFilename = typedConfig.filename;
    if (typeof configFilename === 'string' && configFilename.trim() !== '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilename(configFilename);
    } else {
      setFilename(DEFAULT_FILENAME);
    }
  }, [typedConfig.filename]); // Зависимость от filename из config

  const handleFormatChange = (newFormat: string) => {
    const newExtension = EXPORT_FORMATS.find((f) => f.value === newFormat)?.extension ?? '.csv';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
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
