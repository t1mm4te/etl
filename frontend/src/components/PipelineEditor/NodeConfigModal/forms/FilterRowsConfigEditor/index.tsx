import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

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

  return (
    <div className={styles.root}>
      <p className={styles.title}>Фильтрация строк</p>

      <label className={styles.configLabel}>
        Оставить строки, у которых:
        <input
          list="filter-columns"
          value={typeof typedConfig.column === 'string' ? typedConfig.column : ''}
          placeholder="Выберите столбец для фильтрации"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              column: event.target.value,
            })
          }
        />
      </label>

      <datalist id="filter-columns">
        {availableColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <label className={styles.configLabel}>
        Оператор
        <select
          value={operator}
          onChange={(event) => {
            const nextOperator = event.target.value;
            const nextConfig: Record<string, unknown> = {
              ...typedConfig,
              operator: nextOperator,
            };

            if (OPERATORS_WITHOUT_VALUE.has(nextOperator)) {
              delete nextConfig.value;
            }

            onChange(nextConfig);
          }}
        >
          {FILTER_OPERATORS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
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
