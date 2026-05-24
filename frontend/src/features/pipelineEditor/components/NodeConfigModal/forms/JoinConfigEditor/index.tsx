import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';

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

  const keepOptions: SelectOption[] = [
    { value: 'all', label: 'Оставить все строки' },
    { value: 'matching', label: 'Оставить только совпавшие строки' },
  ];

  const leftColumnOptions: SelectOption[] = leftColumns.map((column) => ({
    value: column,
    label: column,
  }));

  const rightColumnOptions: SelectOption[] = rightColumns.map((column) => ({
    value: column,
    label: column,
  }));

  return (
    <div className={styles.root}>
      <label className={styles.configLabel}>
        Из «{fromLeftLabel}»
        <CustomSelect
          options={keepOptions}
          value={keepOptions.find((item) => item.value === leftKeep)}
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            onChange({
              ...typedConfig,
              how: getHowFromKeepRules(selectedOption?.value ?? 'matching', rightKeep),
            });
          }}
          isSearchable={false}
          isClearable={false}
        />
      </label>

      <label className={styles.configLabel}>
        Из «{fromRightLabel}»
        <CustomSelect
          options={keepOptions}
          value={keepOptions.find((item) => item.value === rightKeep)}
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            onChange({
              ...typedConfig,
              how: getHowFromKeepRules(leftKeep, selectedOption?.value ?? 'matching'),
            });
          }}
          isSearchable={false}
          isClearable={false}
        />
      </label>

      <p className={styles.muted}>Где совпадают значения в столбцах:</p>

      <label className={styles.configLabel}>
        Ключ из первой таблицы
        <CustomSelect
          options={leftColumnOptions}
          value={
            leftColumnOptions.find((option) => option.value === typedConfig.left_on) ??
            (typedConfig.left_on
              ? { value: typedConfig.left_on as string, label: typedConfig.left_on as string }
              : null)
          }
          placeholder="Выберите столбец"
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            onChange({
              ...typedConfig,
              left_on: selectedOption?.value ?? '',
            });
          }}
          isClearable
        />
      </label>

      <label className={styles.configLabel}>
        Ключ из второй таблицы
        <CustomSelect
          options={rightColumnOptions}
          value={
            rightColumnOptions.find((option) => option.value === typedConfig.right_on) ??
            (typedConfig.right_on
              ? { value: typedConfig.right_on as string, label: typedConfig.right_on as string }
              : null)
          }
          placeholder="Выберите столбец"
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            onChange({
              ...typedConfig,
              right_on: selectedOption?.value ?? '',
            });
          }}
          isClearable
        />
      </label>
    </div>
  );
}
