import { useState } from 'react';
import { Button } from '../../../../Button';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

const AGGREGATION_FUNCTIONS = [
  'sum',
  'mean',
  'median',
  'min',
  'max',
  'count',
  'first',
  'last',
  'std',
  'var',
] as const;

type AggregationRow = {
  column: string;
  fn: string;
};

function getGroupBy(config: Record<string, unknown>) {
  const raw = config.group_by;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function rowsFromConfig(config: Record<string, unknown>): AggregationRow[] {
  const raw = config.aggregations;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [{ column: '', fn: 'sum' }];
  }

  const rows = Object.entries(raw).map(([column, fn]) => ({
    column,
    fn: typeof fn === 'string' ? fn : String(fn ?? ''),
  }));

  return rows.length > 0 ? rows : [{ column: '', fn: 'sum' }];
}

function aggregationsFromRows(rows: AggregationRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const column = row.column.trim();
    const fn = row.fn.trim();
    if (column && fn) {
      acc[column] = fn;
    }
    return acc;
  }, {});
}

function parseCommaSeparated(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function AggregateConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const [groupByInput, setGroupByInput] = useState(() => getGroupBy(typedConfig).join(', '));
  const [rows, setRows] = useState<AggregationRow[]>(() => rowsFromConfig(typedConfig));

  const updateRows = (nextRows: AggregationRow[]) => {
    setRows(nextRows);
    onChange({
      ...typedConfig,
      group_by: parseCommaSeparated(groupByInput),
      aggregations: aggregationsFromRows(nextRows),
    });
  };

  const addRow = () => {
    updateRows([...rows, { column: '', fn: 'sum' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      updateRows([{ column: '', fn: 'sum' }]);
      return;
    }

    updateRows(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Группировка и агрегация</p>

      <label className={styles.configLabel}>
        Столбцы группировки (через запятую)
        <input
          value={groupByInput}
          placeholder="Например: city, category"
          onChange={(event) => {
            const nextValue = event.target.value;
            setGroupByInput(nextValue);
            onChange({
              ...typedConfig,
              group_by: parseCommaSeparated(nextValue),
              aggregations: aggregationsFromRows(rows),
            });
          }}
        />
      </label>

      {rows.map((row, index) => (
        <div className={styles.row} key={`aggregate-${index}`}>
          <label className={styles.configLabel}>
            Столбец
            <input
              list="aggregate-columns"
              value={row.column}
              placeholder="Например: amount"
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, column: event.target.value };
                updateRows(nextRows);
              }}
            />
          </label>

          <label className={styles.configLabel}>
            Функция
            <select
              value={row.fn}
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, fn: event.target.value };
                updateRows(nextRows);
              }}
            >
              {AGGREGATION_FUNCTIONS.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </label>

          <Button type="button" color="white" onClick={() => removeRow(index)}>
            Удалить
          </Button>
        </div>
      ))}

      <datalist id="aggregate-columns">
        {availableColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <Button type="button" color="white" onClick={addRow}>
        Добавить агрегацию
      </Button>

      {availableColumns.length > 0 ? (
        <p className={styles.muted}>Входные столбцы: {availableColumns.join(', ')}</p>
      ) : null}
    </div>
  );
}
