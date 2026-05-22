import { Button } from '../../../../../../shared/ui/Button';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';

function getSortBy(config: Record<string, unknown>) {
  const raw = config.by;
  if (!Array.isArray(raw)) return [''];
  const parsed = raw.map((item) => (typeof item === 'string' ? item : String(item ?? '')));
  return parsed.length > 0 ? parsed : [''];
}

function getSortAscending(config: Record<string, unknown>, byLength: number) {
  const raw = config.ascending;
  if (Array.isArray(raw)) {
    return Array.from({ length: byLength }, (_, i) => Boolean(raw[i] ?? true));
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

  const columnOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));

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
    const nextBy = by.filter((_, i) => i !== index);
    const nextAscending = ascending.filter((_, i) => i !== index);
    updateRows(nextBy, nextAscending);
  };

  const updateColumn = (index: number, value: string) => {
    const nextBy = [...by];
    nextBy[index] = value;
    updateRows(nextBy, ascending);
  };

  const updateOrder = (index: number, isAsc: boolean) => {
    const nextAscending = [...ascending];
    nextAscending[index] = isAsc;
    updateRows(by, nextAscending);
  };

  return (
    <div className={styles.root}>
      {by.map((column, index) => (
        <div className={styles.sortBlock} key={`sort-${index}`}>
          <button className={styles.closeButton} onClick={() => removeRow(index)} type="button">
            ✕
          </button>

          <div className={styles.selectsRow}>
            <div className={styles.selectWrapper}>
              <CustomSelect
                options={columnOptions}
                value={
                  columnOptions.find((opt) => opt.value === column) ??
                  (column ? { value: column, label: column } : null)
                }
                placeholder="Выберите столбец"
                onChange={(option) =>
                  updateColumn(index, (option as SelectOption | null)?.value ?? '')
                }
                isClearable
              />
            </div>

            <div className={styles.selectWrapper}>
              <CustomSelect
                options={[
                  { value: 'asc', label: 'A-Z' },
                  { value: 'desc', label: 'Z-A' },
                ]}
                value={{
                  value: ascending[index] ? 'asc' : 'desc',
                  label: ascending[index] ? 'A-Z' : 'Z-A',
                }}
                onChange={(option) => updateOrder(index, (option as SelectOption)?.value === 'asc')}
                isSearchable={false}
                isClearable={false}
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" color="white" onClick={addRow}>
        + Добавить правило сортировки
      </Button>
    </div>
  );
}
