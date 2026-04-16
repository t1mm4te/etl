import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

function getColumns(config: Record<string, unknown>) {
  const raw = config.columns;
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed = raw.map((item) => (typeof item === 'string' ? item : String(item ?? '')));
  return parsed.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function SelectColumnsConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const selectedColumns = getColumns(typedConfig);
  const uniqueAvailableColumns = Array.from(new Set(availableColumns));
  const availableSet = new Set(uniqueAvailableColumns);
  const selectedSet = new Set(selectedColumns);
  const allSelected =
    uniqueAvailableColumns.length > 0 && uniqueAvailableColumns.every((column) => selectedSet.has(column));
  const extraSelectedColumns = selectedColumns.filter((column) => !availableSet.has(column));

  const updateColumns = (nextColumns: string[]) => {
    const nextConfig: Record<string, unknown> = {
      ...typedConfig,
      columns: nextColumns,
    };
    onChange(nextConfig);
  };

  const onSelectAllToggle = (checked: boolean) => {
    if (!checked) {
      updateColumns([]);
      return;
    }

    updateColumns([...uniqueAvailableColumns, ...extraSelectedColumns]);
  };

  const onColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      if (selectedSet.has(column)) {
        return;
      }

      updateColumns([...selectedColumns, column]);
      return;
    }

    updateColumns(selectedColumns.filter((item) => item !== column));
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Выбор столбцов</p>

      {uniqueAvailableColumns.length === 0 ? (
        <p className={styles.muted}>Список входных столбцов пока недоступен.</p>
      ) : (
        <>
          <label className={styles.checkboxAll}>
            <input
              className={styles.checkboxInput}
              type="checkbox"
              checked={allSelected}
              onChange={(event) => onSelectAllToggle(event.currentTarget.checked)}
            />
            Отметить все
          </label>

          <div className={styles.checkboxList}>
            {uniqueAvailableColumns.map((column) => (
              <label className={styles.checkboxItem} key={column}>
                <input
                  className={styles.checkboxInput}
                  type="checkbox"
                  checked={selectedSet.has(column)}
                  onChange={(event) => onColumnToggle(column, event.currentTarget.checked)}
                />
                {column}
              </label>
            ))}
          </div>
        </>
      )}

      {extraSelectedColumns.length > 0 ? (
        <p className={styles.muted}>
          Выбраны столбцы, которых нет во входных данных: {extraSelectedColumns.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
