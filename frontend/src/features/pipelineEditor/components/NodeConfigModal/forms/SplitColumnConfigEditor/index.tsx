import { useState } from 'react';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

function getNewColumns(config: Record<string, unknown>) {
  const raw = config.new_columns;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseCommaSeparated(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function SplitColumnConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const [newColumnsInput, setNewColumnsInput] = useState(() =>
    getNewColumns(typedConfig).join(', ')
  );

  return (
    <div className={styles.root}>
      <p className={styles.title}>Разделение столбца</p>

      <label className={styles.configLabel}>
        Столбец
        <input
          list="split-column-name"
          value={typeof typedConfig.column === 'string' ? typedConfig.column : ''}
          placeholder="Выберете столбец для разделения"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              column: event.target.value,
            })
          }
        />
      </label>

      <datalist id="split-column-name">
        {availableColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <label className={styles.configLabel}>
        Разделитель
        <input
          value={typeof typedConfig.separator === 'string' ? typedConfig.separator : ','}
          placeholder=","
          onChange={(event) =>
            onChange({
              ...typedConfig,
              separator: event.target.value,
            })
          }
        />
      </label>

      <label className={styles.configLabel}>
        Имена новых столбцов (через запятую)
        <input
          value={newColumnsInput}
          placeholder="Например: first_name, last_name"
          onChange={(event) => {
            const nextValue = event.target.value;
            setNewColumnsInput(nextValue);
            const parsed = parseCommaSeparated(nextValue);
            const nextConfig: Record<string, unknown> = {
              ...typedConfig,
            };

            if (parsed.length === 0) {
              delete nextConfig.new_columns;
            } else {
              nextConfig.new_columns = parsed;
            }

            onChange(nextConfig);
          }}
        />
      </label>

      {availableColumns.length > 0 ? (
        <p className={styles.muted}>Входные столбцы: {availableColumns.join(', ')}</p>
      ) : null}

      <p className={styles.muted}>
        Если не указать новые имена, бэкенд сгенерирует их автоматически.
      </p>
    </div>
  );
}
