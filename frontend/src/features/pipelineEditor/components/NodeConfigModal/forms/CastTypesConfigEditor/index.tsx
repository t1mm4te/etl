import { useState } from 'react';
import { Button } from '../../../../../../shared/ui/Button';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

const TYPE_OPTIONS = ['int64', 'float64', 'str', 'bool', 'datetime64[ns]', 'category'] as const;
const TYPE_SELECT_OPTIONS: SelectOption[] = TYPE_OPTIONS.map((dtype) => ({
  value: dtype,
  label: dtype,
}));

type MappingRow = {
  column: string;
  dtype: string;
};

function rowsFromConfig(config: Record<string, unknown>): MappingRow[] {
  const raw = config.mapping;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [{ column: '', dtype: 'str' }];
  }

  const rows = Object.entries(raw).map(([column, dtype]) => ({
    column,
    dtype: typeof dtype === 'string' ? dtype : String(dtype ?? ''),
  }));

  return rows.length > 0 ? rows : [{ column: '', dtype: 'str' }];
}

function mappingFromRows(rows: MappingRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const column = row.column.trim();
    const dtype = row.dtype.trim();
    if (column && dtype) {
      acc[column] = dtype;
    }
    return acc;
  }, {});
}

export function CastTypesConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const [rows, setRows] = useState<MappingRow[]>(() => rowsFromConfig(typedConfig));
  const columnOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));

  const updateRows = (nextRows: MappingRow[]) => {
    setRows(nextRows);
    onChange({
      ...typedConfig,
      mapping: mappingFromRows(nextRows),
    });
  };

  const addRow = () => {
    updateRows([...rows, { column: '', dtype: 'str' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      updateRows([{ column: '', dtype: 'str' }]);
      return;
    }

    updateRows(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Приведение типов</p>

      {rows.map((row, index) => (
        <div className={styles.row} key={`cast-types-${index}`}>
          <label className={styles.configLabel}>
            Столбец
            <CustomSelect
              options={columnOptions}
              value={
                columnOptions.find((option) => option.value === row.column) ??
                (row.column ? { value: row.column, label: row.column } : null)
              }
              placeholder="Выберите столбец"
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
            Новый тип
            <CustomSelect
              options={TYPE_SELECT_OPTIONS}
              value={
                TYPE_SELECT_OPTIONS.find((option) => option.value === row.dtype) ??
                TYPE_SELECT_OPTIONS[2]
              }
              onChange={(option) => {
                const selectedOption = option as SelectOption | null;
                const nextRows = [...rows];
                nextRows[index] = { ...row, dtype: selectedOption?.value ?? 'str' };
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
        Добавить преобразование
      </Button>
    </div>
  );
}
