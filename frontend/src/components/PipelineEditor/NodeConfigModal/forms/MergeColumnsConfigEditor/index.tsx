import { useState } from 'react';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

function getColumns(config: Record<string, unknown>) {
  const raw = config.columns;
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

export function MergeColumnsConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const [columnsInput, setColumnsInput] = useState(() => getColumns(typedConfig).join(', '));

  return (
    <div className={styles.root}>
      <p className={styles.title}>Объединение столбцов</p>

      <label className={styles.configLabel}>
        Столбцы для объединения (через запятую)
        <input
          value={columnsInput}
          placeholder="Например: first_name, last_name"
          onChange={(event) => {
            const nextValue = event.target.value;
            setColumnsInput(nextValue);
            onChange({
              ...typedConfig,
              columns: parseCommaSeparated(nextValue),
            });
          }}
        />
      </label>

      {availableColumns.length > 0 ? (
        <p className={styles.muted}>Доступные столбцы: {availableColumns.join(', ')}</p>
      ) : null}

      <label className={styles.configLabel}>
        Разделитель
        <input
          value={typeof typedConfig.separator === 'string' ? typedConfig.separator : ' '}
          placeholder="Пробел"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              separator: event.target.value,
            })
          }
        />
      </label>

      <label className={styles.configLabel}>
        Имя нового столбца
        <input
          value={typeof typedConfig.new_column === 'string' ? typedConfig.new_column : ''}
          placeholder="Например: full_name"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              new_column: event.target.value,
            })
          }
        />
      </label>

      <p className={styles.muted}>Для операции требуется минимум два столбца.</p>
    </div>
  );
}
