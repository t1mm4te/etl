import { useState } from 'react';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Input } from '../../../../../../shared/ui/Input';

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
  const columnOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));

  return (
    <div className={styles.root}>
      <p className={styles.title}>Разделение столбца</p>

      <label className={styles.configLabel}>
        Столбец
        <CustomSelect
          options={columnOptions}
          value={
            columnOptions.find((option) => option.value === typedConfig.column) ??
            (typedConfig.column
              ? { value: typedConfig.column as string, label: typedConfig.column as string }
              : null)
          }
          placeholder="Выберете столбец для разделения"
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            onChange({
              ...typedConfig,
              column: selectedOption?.value ?? '',
            });
          }}
          isClearable
        />
      </label>

      <label className={styles.configLabel}>
        Разделитель
        <Input
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
        <Input
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

      <p className={styles.muted}>
        Если не указать новые имена, бэкенд сгенерирует их автоматически.
      </p>
    </div>
  );
}
