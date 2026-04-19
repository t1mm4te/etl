import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

const KEEP_OPTIONS = [
  { value: 'all', label: 'Оставить все строки' },
  { value: 'matching', label: 'Оставить только совпавшие строки' },
] as const;

function getKeepRules(how: string) {
  if (how === 'left') {
    return { leftKeep: 'all', rightKeep: 'matching' } as const;
  }
  if (how === 'right') {
    return { leftKeep: 'matching', rightKeep: 'all' } as const;
  }
  if (how === 'outer') {
    return { leftKeep: 'all', rightKeep: 'all' } as const;
  }

  return { leftKeep: 'matching', rightKeep: 'matching' } as const;
}

function getHowFromKeepRules(leftKeep: string, rightKeep: string) {
  if (leftKeep === 'all' && rightKeep === 'all') {
    return 'outer';
  }
  if (leftKeep === 'all' && rightKeep === 'matching') {
    return 'left';
  }
  if (leftKeep === 'matching' && rightKeep === 'all') {
    return 'right';
  }

  return 'inner';
}

export function JoinConfigEditor({
  config,
  availableColumns,
  availableColumnsByPort,
  inputNodeLabelsByPort,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const how = typeof typedConfig.how === 'string' ? typedConfig.how : 'inner';
  const { leftKeep, rightKeep } = getKeepRules(how);

  const fallbackColumns = availableColumns;
  const mainColumns = availableColumnsByPort?.main ?? [];
  const leftColumns = availableColumnsByPort?.left ?? mainColumns ?? fallbackColumns;
  const rightColumns = availableColumnsByPort?.right ?? mainColumns ?? fallbackColumns;

  const fromLeftLabel =
    inputNodeLabelsByPort?.left ?? inputNodeLabelsByPort?.main ?? 'предыдущего узла';
  const fromRightLabel = inputNodeLabelsByPort?.right ?? 'второго узла';

  return (
    <div className={styles.root}>
      <p className={styles.title}>Сопоставление двух таблиц</p>

      <label className={styles.configLabel}>
        Из «{fromLeftLabel}»
        <select
          value={leftKeep}
          onChange={(event) =>
            onChange({
              ...typedConfig,
              how: getHowFromKeepRules(event.target.value, rightKeep),
            })
          }
        >
          {KEEP_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.configLabel}>
        Из «{fromRightLabel}»
        <select
          value={rightKeep}
          onChange={(event) =>
            onChange({
              ...typedConfig,
              how: getHowFromKeepRules(leftKeep, event.target.value),
            })
          }
        >
          {KEEP_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <p className={styles.muted}>Где совпадают значения в столбцах:</p>

      <label className={styles.configLabel}>
        Ключ из первой таблицы
        <input
          list="join-left-columns"
          value={typeof typedConfig.left_on === 'string' ? typedConfig.left_on : ''}
          placeholder="Выберите столбец"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              left_on: event.target.value,
            })
          }
        />
      </label>

      <label className={styles.configLabel}>
        Ключ из второй таблицы
        <input
          list="join-right-columns"
          value={typeof typedConfig.right_on === 'string' ? typedConfig.right_on : ''}
          placeholder="Выберите столбец"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              right_on: event.target.value,
            })
          }
        />
      </label>

      <datalist id="join-left-columns">
        {leftColumns.map((column) => (
          <option key={`left-${column}`} value={column} />
        ))}
      </datalist>

      <datalist id="join-right-columns">
        {rightColumns.map((column) => (
          <option key={`right-${column}`} value={column} />
        ))}
      </datalist>

      <p className={styles.muted}>Если столбца нет в подсказке, можно ввести его вручную.</p>
    </div>
  );
}
