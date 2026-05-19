import { useState } from 'react';
import { Button } from '../../../../../../shared/ui/Button';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
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

const AGGREGATION_FUNCTION_OPTIONS: SelectOption[] = AGGREGATION_FUNCTIONS.map((fn) => ({
  value: fn,
  label: fn,
}));

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

export function AggregateConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const groupBy = getGroupBy(typedConfig);
  const [rows, setRows] = useState<AggregationRow[]>(() => rowsFromConfig(typedConfig));
  const columnOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));
  const selectedGroupByOptions: SelectOption[] = groupBy
    .map((col) => columnOptions.find((opt) => opt.value === col))
    .filter((opt): opt is SelectOption => Boolean(opt));

  const updateRows = (nextRows: AggregationRow[]) => {
    setRows(nextRows);
    onChange({
      ...typedConfig,
      group_by: groupBy,
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
        Столбцы группировки
        <CustomSelect
          options={columnOptions}
          value={selectedGroupByOptions}
          onChange={(options) => {
            const selected = Array.isArray(options) ? options : options ? [options] : [];
            const selectedCols = (selected as SelectOption[]).map((opt) => opt.value);
            onChange({
              ...typedConfig,
              group_by: selectedCols,
              aggregations: aggregationsFromRows(rows),
            });
          }}
          placeholder="Выберите столбцы группировки"
          isMulti
          isClearable
          isSearchable
        />
      </label>

      {rows.map((row, index) => (
        <div className={styles.row} key={`aggregate-${index}`}>
          <label className={styles.configLabel}>
            Столбец
            <CustomSelect
              options={columnOptions}
              value={
                columnOptions.find((option) => option.value === row.column) ??
                (row.column ? { value: row.column, label: row.column } : null)
              }
              placeholder="Например: amount"
              onChange={(option) => {
                const selectedOption = option as SelectOption | null;
                const nextRows = [...rows];
                nextRows[index] = { ...row, column: selectedOption?.value ?? '' };
                updateRows(nextRows);
              }}
              isClearable
            />
          </label>

          <label className={styles.configLabel}>
            Функция
            <CustomSelect
              options={AGGREGATION_FUNCTION_OPTIONS}
              value={
                AGGREGATION_FUNCTION_OPTIONS.find((option) => option.value === row.fn) ??
                AGGREGATION_FUNCTION_OPTIONS[0]
              }
              onChange={(option) => {
                const selectedOption = option as SelectOption | null;
                const nextRows = [...rows];
                nextRows[index] = { ...row, fn: selectedOption?.value ?? 'sum' };
                updateRows(nextRows);
              }}
              isSearchable={false}
              isClearable={false}
            />
          </label>

          <Button type="button" color="white" onClick={() => removeRow(index)}>
            Удалить
          </Button>
        </div>
      ))}

      <Button type="button" color="white" onClick={addRow}>
        Добавить агрегацию
      </Button>
    </div>
  );
}
