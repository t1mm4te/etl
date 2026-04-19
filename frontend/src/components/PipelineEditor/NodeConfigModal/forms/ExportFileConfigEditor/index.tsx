import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'parquet', label: 'Parquet (.parquet)' },
] as const;

export function ExportFileConfigEditor({ config, onChange }: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const format = typeof typedConfig.format === 'string' ? typedConfig.format : 'csv';

  return (
    <div className={styles.root}>
      <p className={styles.title}>Экспорт в файл</p>

      <label className={styles.configLabel}>
        Формат файла
        <select
          value={format}
          onChange={(event) =>
            onChange({
              ...typedConfig,
              format: event.target.value,
            })
          }
        >
          {EXPORT_FORMATS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
