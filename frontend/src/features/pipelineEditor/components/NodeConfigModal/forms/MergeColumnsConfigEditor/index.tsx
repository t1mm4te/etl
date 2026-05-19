import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Input } from '../../../../../../shared/ui/Input';

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

function normalizeColumns(options: SelectOption | readonly SelectOption[] | null) {
  if (!options) {
    return [];
  }

  if (Array.isArray(options)) {
    return Array.from(new Set(options.map((option) => option.value)));
  }

  if ('value' in options) {
    return [options.value];
  }

  return [];
}

export function MergeColumnsConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const selectedColumns = getColumns(typedConfig);

  const columnOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));

  const selectedValues = columnOptions.filter((opt) => selectedColumns.includes(opt.value));

  return (
    <div className={styles.root}>
      <p className={styles.title}>Объединение столбцов</p>

      <label className={styles.configLabel}>
        Столбцы для объединения
        <CustomSelect
          options={columnOptions}
          value={selectedValues}
          onChange={(options) => {
            onChange({
              ...typedConfig,
              columns: normalizeColumns(options),
            });
          }}
          placeholder="Выберите столбцы для объединения"
          isMulti
          isClearable
        />
      </label>

      <label className={styles.configLabel}>
        Разделитель
        <Input
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
        <Input
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
