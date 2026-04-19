import { useMemo, useState } from 'react';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

const STRATEGY_OPTIONS = [
  { value: 'value', label: 'Заменить значением' },
  { value: 'ffill', label: 'Протянуть вперед (ffill)' },
  { value: 'bfill', label: 'Протянуть назад (bfill)' },
  { value: 'mean', label: 'Среднее (mean)' },
  { value: 'median', label: 'Медиана (median)' },
  { value: 'mode', label: 'Мода (mode)' },
  { value: 'drop', label: 'Удалить строки с пропусками' },
] as const;

const VALUE_BASED_STRATEGY = 'value';

function parseFillValue(raw: string): unknown {
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

function getSelectedColumns(config: Record<string, unknown>) {
  const raw = config.columns;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function FillMissingConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const strategy = typeof typedConfig.strategy === 'string' ? typedConfig.strategy : 'drop';
  const selectedColumns = useMemo(() => getSelectedColumns(typedConfig), [typedConfig]);
  const selectedSet = new Set(selectedColumns);
  const [fillValueInput, setFillValueInput] = useState(
    typeof typedConfig.fill_value === 'string'
      ? typedConfig.fill_value
      : String(typedConfig.fill_value ?? '')
  );

  const updateColumns = (nextColumns: string[]) => {
    const nextConfig: Record<string, unknown> = { ...typedConfig };
    if (nextColumns.length === 0) {
      delete nextConfig.columns;
    } else {
      nextConfig.columns = nextColumns;
    }
    onChange(nextConfig);
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Заполнение пропусков</p>

      <label className={styles.configLabel}>
        Стратегия
        <select
          value={strategy}
          onChange={(event) => {
            const nextStrategy = event.target.value;
            const nextConfig: Record<string, unknown> = {
              ...typedConfig,
              strategy: nextStrategy,
            };

            if (nextStrategy !== VALUE_BASED_STRATEGY) {
              delete nextConfig.fill_value;
            }

            onChange(nextConfig);
          }}
        >
          {STRATEGY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {strategy === VALUE_BASED_STRATEGY ? (
        <label className={styles.configLabel}>
          Значение заполнения
          <input
            value={fillValueInput}
            placeholder="Например: 0"
            onChange={(event) => {
              const nextValue = event.target.value;
              setFillValueInput(nextValue);
              onChange({
                ...typedConfig,
                strategy,
                fill_value: parseFillValue(nextValue),
              });
            }}
          />
        </label>
      ) : null}

      {availableColumns.length > 0 ? (
        <div className={styles.columnsBlock}>
          <p className={styles.muted}>Столбцы (пусто = все):</p>
          <div className={styles.checkboxList}>
            {availableColumns.map((column) => (
              <label className={styles.checkboxItem} key={column}>
                <input
                  className={styles.checkboxInput}
                  type="checkbox"
                  checked={selectedSet.has(column)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    if (checked) {
                      if (selectedSet.has(column)) {
                        return;
                      }
                      updateColumns([...selectedColumns, column]);
                    } else {
                      updateColumns(selectedColumns.filter((item) => item !== column));
                    }
                  }}
                />
                {column}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.muted}>Список столбцов пока недоступен.</p>
      )}
    </div>
  );
}
