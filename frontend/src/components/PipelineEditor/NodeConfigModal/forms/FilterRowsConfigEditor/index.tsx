import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../shared/ui/CustomSelect';

const FILTER_OPERATORS = [
  { value: '==', label: 'Равно' },
  { value: '!=', label: 'Не равно' },
  { value: '>', label: 'Больше' },
  { value: '<', label: 'Меньше' },
  { value: '>=', label: 'Больше или равно' },
  { value: '<=', label: 'Меньше или равно' },
  { value: 'contains', label: 'Содержит' },
  { value: 'not_contains', label: 'Не содержит' },
  { value: 'is_null', label: 'Пустое значение (is_null)' },
  { value: 'is_not_null', label: 'Не пустое значение (is_not_null)' },
] as const;

const OPERATORS_WITHOUT_VALUE = new Set<string>(['is_null', 'is_not_null']);

function getOperator(config: Record<string, unknown>) {
  const raw = config.operator;
  return typeof raw === 'string' ? raw : '==';
}

function parseFilterValue(raw: string, operator: string): unknown {
  if (operator === 'contains' || operator === 'not_contains') {
    return raw;
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return '';
  }

  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }

  return raw;
}

export function FilterRowsConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const operator = getOperator(typedConfig);
  const hasValue = !OPERATORS_WITHOUT_VALUE.has(operator);

  const operatorOptions = FILTER_OPERATORS.map((op) => ({
    value: op.value,
    label: op.label,
  }));

  const columnOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));

  const selectedOperator = operatorOptions.find((opt) => opt.value === operator);
  const selectedColumn = columnOptions.find((opt) => opt.value === typedConfig.column);

  return (
    <div className={styles.root}>
      <p className={styles.title}>Фильтрация строк</p>

      <label className={styles.configLabel}>
        Оставить строки, у которых:
        <CustomSelect
          options={columnOptions}
          value={selectedColumn}
          onChange={(option) =>
            onChange({
              ...typedConfig,
              column: !Array.isArray(option) && option?.value ? option.value : '',
            })
          }
          placeholder="Выберите столбец для фильтрации"
          isClearable
        />
      </label>

      <label className={styles.configLabel}>
        Оператор
        <CustomSelect
          options={operatorOptions}
          value={selectedOperator}
          onChange={(option) => {
            const nextOperator = !Array.isArray(option) && option?.value ? option.value : '==';
            const nextConfig: Record<string, unknown> = {
              ...typedConfig,
              operator: nextOperator,
            };

            if (OPERATORS_WITHOUT_VALUE.has(nextOperator)) {
              delete nextConfig.value;
            }

            onChange(nextConfig);
          }}
          placeholder="Выберите оператор"
        />
      </label>

      {hasValue ? (
        <label className={styles.configLabel}>
          Значение
          <input
            value={
              typeof typedConfig.value === 'string'
                ? typedConfig.value
                : String(typedConfig.value ?? '')
            }
            placeholder="Например: 100"
            onChange={(event) =>
              onChange({
                ...typedConfig,
                value: parseFilterValue(event.target.value, operator),
              })
            }
          />
        </label>
      ) : null}
    </div>
  );
}
