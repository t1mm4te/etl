import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

function getSubset(config: Record<string, unknown>) {
  const raw = config.subset;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getKeep(config: Record<string, unknown>) {
  const raw = config.keep;
  if (raw === 'first' || raw === 'last' || raw === false) {
    return raw;
  }

  return 'first';
}

export function DeduplicateConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const subset = getSubset(typedConfig);
  const keep = getKeep(typedConfig);
  const selectedSet = new Set(subset);
  const uniqueAvailableColumns = Array.from(new Set(availableColumns));
  const allSelectedManually =
    uniqueAvailableColumns.length > 0 &&
    uniqueAvailableColumns.every((column) => selectedSet.has(column));
  const allColumnsMode = subset.length === 0 || allSelectedManually;

  const updateSubset = (nextSubset: string[]) => {
    const nextConfig: Record<string, unknown> = {
      ...typedConfig,
    };

    if (nextSubset.length === 0) {
      delete nextConfig.subset;
    } else {
      nextConfig.subset = nextSubset;
    }

    onChange(nextConfig);
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Удаление дубликатов</p>

      <label className={styles.configLabel}>
        Какие строки оставлять
        <select
          value={keep === false ? 'none' : keep}
          onChange={(event) => {
            const value = event.target.value;
            onChange({
              ...typedConfig,
              keep: value === 'none' ? false : value,
            });
          }}
        >
          <option value="first">Первая строка в группе</option>
          <option value="last">Последняя строка в группе</option>
          <option value="none">Не оставлять дубликаты</option>
        </select>
      </label>

      {uniqueAvailableColumns.length === 0 ? (
        <p className={styles.muted}>Список входных столбцов пока недоступен.</p>
      ) : (
        <>
          <label className={styles.checkboxAll}>
            <input
              className={styles.checkboxInput}
              type="checkbox"
              checked={allColumnsMode}
              onChange={(event) => {
                if (event.currentTarget.checked) {
                  updateSubset([]);
                  return;
                }

                updateSubset(uniqueAvailableColumns);
              }}
            />
            Проверять дубликаты по всем столбцам
          </label>

          <div className={styles.checkboxList}>
            {uniqueAvailableColumns.map((column) => (
              <label className={styles.checkboxItem} key={column}>
                <input
                  className={styles.checkboxInput}
                  type="checkbox"
                  checked={selectedSet.has(column)}
                  onChange={(event) => {
                    if (event.currentTarget.checked) {
                      updateSubset([...subset, column]);
                      return;
                    }

                    updateSubset(subset.filter((item) => item !== column));
                  }}
                />
                {column}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
