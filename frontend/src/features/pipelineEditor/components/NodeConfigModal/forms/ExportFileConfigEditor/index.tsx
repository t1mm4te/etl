import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'parquet', label: 'Parquet (.parquet)' },
] as const;

export function ExportFileConfigEditor({ config, onChange }: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const format = typeof typedConfig.format === 'string' ? typedConfig.format : 'csv';
  const options: SelectOption[] = EXPORT_FORMATS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    <div className={styles.root}>
      <p className={styles.title}>Экспорт в файл</p>

      <label className={styles.configLabel}>
        Формат файла
        <CustomSelect
          options={options}
          value={options.find((item) => item.value === format) ?? options[0]}
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            onChange({
              ...typedConfig,
              format: selectedOption?.value ?? 'csv',
            });
          }}
          isSearchable={false}
          isClearable={false}
        />
      </label>
    </div>
  );
}
