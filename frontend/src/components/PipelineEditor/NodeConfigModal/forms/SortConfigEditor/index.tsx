import { Button } from '../../../../Button';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

function getSortBy(config: Record<string, unknown>) {
  const raw = config.by;
  if (!Array.isArray(raw)) {
    return [''];
  }

  const parsed = raw.map((item) => (typeof item === 'string' ? item : String(item ?? '')));
  return parsed.length > 0 ? parsed : [''];
}

function getSortAscending(config: Record<string, unknown>, byLength: number) {
  const raw = config.ascending;
  if (Array.isArray(raw)) {
    return Array.from({ length: byLength }, (_, index) => Boolean(raw[index] ?? true));
  }

  if (typeof raw === 'boolean') {
    return Array.from({ length: byLength }, () => raw);
  }

  return Array.from({ length: byLength }, () => true);
}

export function SortConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const by = getSortBy(typedConfig);
  const ascending = getSortAscending(typedConfig, by.length);

  const updateRows = (nextBy: string[], nextAscending: boolean[]) => {
    const nextConfig: Record<string, unknown> = {
      ...typedConfig,
      by: nextBy,
      ascending: nextAscending.length === 1 ? nextAscending[0] : nextAscending,
    };
    onChange(nextConfig);
  };

  const addRow = () => {
    updateRows([...by, ''], [...ascending, true]);
  };

  const removeRow = (index: number) => {
    if (by.length <= 1) {
      updateRows([''], [true]);
      return;
    }

    const nextBy = by.filter((_, itemIndex) => itemIndex !== index);
    const nextAscending = ascending.filter((_, itemIndex) => itemIndex !== index);
    updateRows(nextBy, nextAscending);
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Сортировка</p>
      {by.map((column, index) => (
        <div className={styles.row} key={`sort-${index}`}>
          <label className={styles.configLabel}>
            Столбец
            <input
              list="sort-columns"
              value={column}
              placeholder="Выберите столбец для сортировки"
              onChange={(event) => {
                const nextBy = [...by];
                nextBy[index] = event.target.value;
                updateRows(nextBy, ascending);
              }}
            />
          </label>

          <label className={styles.configLabel}>
            Порядок
            <select
              value={ascending[index] ? 'asc' : 'desc'}
              onChange={(event) => {
                const nextAscending = [...ascending];
                nextAscending[index] = event.target.value === 'asc';
                updateRows(by, nextAscending);
              }}
            >
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </label>

          <Button type="button" color="white" onClick={() => removeRow(index)}>
            Удалить
          </Button>
        </div>
      ))}

      <datalist id="sort-columns">
        {availableColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <Button type="button" color="white" onClick={addRow}>
        Добавить правило сортировки
      </Button>
    </div>
  );
}
