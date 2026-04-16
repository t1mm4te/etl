import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../Button';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

type RenameRow = {
  source: string;
  target: string;
};

function rowsFromConfig(config: Record<string, unknown>): RenameRow[] {
  const rawMapping = config.mapping;
  if (!rawMapping || typeof rawMapping !== 'object' || Array.isArray(rawMapping)) {
    return [{ source: '', target: '' }];
  }

  const entries = Object.entries(rawMapping).map(([source, target]) => ({
    source,
    target: typeof target === 'string' ? target : String(target ?? ''),
  }));

  return entries.length > 0 ? entries : [{ source: '', target: '' }];
}

function mappingFromRows(rows: RenameRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const source = row.source.trim();
    const target = row.target.trim();
    if (source && target) {
      acc[source] = target;
    }
    return acc;
  }, {});
}

export function RenameColumnsConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const initialRows = useMemo(() => rowsFromConfig(typedConfig), [typedConfig]);
  const [rows, setRows] = useState<RenameRow[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateRows = (nextRows: RenameRow[]) => {
    setRows(nextRows);
    const nextConfig: Record<string, unknown> = {
      ...typedConfig,
      mapping: mappingFromRows(nextRows),
    };
    onChange(nextConfig);
  };

  const addRow = () => {
    updateRows([...rows, { source: '', target: '' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      updateRows([{ source: '', target: '' }]);
      return;
    }

    updateRows(rows.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Переименование столбцов</p>

      {rows.map((row, index) => (
        <div className={styles.row} key={`rename-${index}`}>
          <label className={styles.configLabel}>
            Исходное имя
            <input
              list="rename-columns-source"
              value={row.source}
              placeholder="Например: old_name"
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, source: event.target.value };
                updateRows(nextRows);
              }}
            />
          </label>

          <label className={styles.configLabel}>
            Новое имя
            <input
              value={row.target}
              placeholder="Например: full_name"
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, target: event.target.value };
                updateRows(nextRows);
              }}
            />
          </label>

          <Button type="button" color="white" onClick={() => removeRow(index)}>
            Удалить
          </Button>
        </div>
      ))}

      <datalist id="rename-columns-source">
        {availableColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <Button type="button" color="white" onClick={addRow}>
        Добавить переименование
      </Button>
    </div>
  );
}
