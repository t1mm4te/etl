import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

export function ComputedColumnConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;

  return (
    <div className={styles.root}>
      <p className={styles.title}>Вычисляемый столбец</p>

      <label className={styles.configLabel}>
        Имя нового столбца
        <input
          value={typeof typedConfig.new_column === 'string' ? typedConfig.new_column : ''}
          placeholder="Например: total"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              new_column: event.target.value,
            })
          }
        />
      </label>

      <label className={styles.configLabel}>
        Выражение
        <input
          value={typeof typedConfig.expression === 'string' ? typedConfig.expression : ''}
          placeholder="Например: price * quantity"
          onChange={(event) =>
            onChange({
              ...typedConfig,
              expression: event.target.value,
            })
          }
        />
      </label>

      {availableColumns.length > 0 ? (
        <p className={styles.muted}>Доступные столбцы: {availableColumns.join(', ')}</p>
      ) : null}

      <p className={styles.muted}>
        Поддерживаются арифметические выражения, например: (price * quantity) - discount.
      </p>
    </div>
  );
}
