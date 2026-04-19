import { useState } from 'react';
import { Button } from '../../../../Button';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

const TYPE_OPTIONS = ['int64', 'float64', 'str', 'bool', 'datetime64[ns]', 'category'] as const;

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
            <input
              list="cast-types-columns"
              value={row.column}
              placeholder="Выберите столбец"
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, column: event.target.value };
                updateRows(nextRows);
              }}
            />
          </label>

          <label className={styles.configLabel}>
            Новый тип
            <select
              value={row.dtype}
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, dtype: event.target.value };
                updateRows(nextRows);
              }}
            >
              {TYPE_OPTIONS.map((dtype) => (
                <option key={dtype} value={dtype}>
                  {dtype}
                </option>
              ))}
            </select>
          </label>

          <Button type="button" color="white" onClick={() => removeRow(index)}>
            Удалить
          </Button>
        </div>
      ))}

      <datalist id="cast-types-columns">
        {availableColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <Button type="button" color="white" onClick={addRow}>
        Добавить преобразование
      </Button>
    </div>
  );
}
