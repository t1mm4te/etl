import { useState } from 'react';
import { Checkbox } from '@base-ui/react';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Input } from '../../../../../../shared/ui/Input';

const STRATEGY_OPTIONS = [
  { value: 'value', label: 'Заменить значением' },
  { value: 'ffill', label: 'Протянуть вперед (ffill)' },
  { value: 'bfill', label: 'Протянуть назад (bfill)' },
  { value: 'mean', label: 'Среднее значение' },
  { value: 'median', label: 'Медиана' },
  { value: 'mode', label: 'Мода' },
  { value: 'drop', label: 'Удалить строки с пропусками' },
] as const;

const VALUE_BASED_STRATEGY = 'value';

function parseFillValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return asNumber;

  return raw;
}

function getSubset(config: Record<string, unknown>) {
  const raw = config.columns;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function FillMissingConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const strategy = typeof typedConfig.strategy === 'string' ? typedConfig.strategy : 'drop';
  const subset = getSubset(typedConfig);

  const [fillValueInput, setFillValueInput] = useState(
    typeof typedConfig.fill_value === 'string'
      ? typedConfig.fill_value
      : String(typedConfig.fill_value ?? '')
  );

  const selectedSet = new Set(subset);
  const uniqueAvailableColumns = Array.from(new Set(availableColumns));

  const allSelectedManually =
    uniqueAvailableColumns.length > 0 &&
    uniqueAvailableColumns.every((column) => selectedSet.has(column));

  const allColumnsMode = subset.length === 0 || allSelectedManually;

  const strategyOptions: SelectOption[] = STRATEGY_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const updateSubset = (nextSubset: string[]) => {
    const nextConfig: Record<string, unknown> = { ...typedConfig, strategy };

    if (nextSubset.length === 0) {
      delete nextConfig.columns;
    } else {
      nextConfig.columns = nextSubset;
    }

    onChange(nextConfig);
  };

  return (
    <div className={styles.root}>
      {/* Стратегия — как в Deduplicate */}
      <label className={styles.configLabel}>
        Стратегия заполнения пропусков
        <CustomSelect
          options={strategyOptions}
          value={strategyOptions.find((item) => item.value === strategy) ?? strategyOptions[6]}
          onChange={(option) => {
            const selectedOption = option as SelectOption | null;
            const nextStrategy = selectedOption?.value ?? 'drop';
            const nextConfig: Record<string, unknown> = {
              ...typedConfig,
              strategy: nextStrategy,
            };

            if (nextStrategy !== VALUE_BASED_STRATEGY) {
              delete nextConfig.fill_value;
            }

            onChange(nextConfig);
          }}
          isSearchable={false}
          isClearable={false}
        />
      </label>

      {/* Поле значения (показывается только при стратегии 'value') */}
      {strategy === VALUE_BASED_STRATEGY && (
        <label className={styles.configLabel}>
          Значение для заполнения
          <Input
            value={fillValueInput}
            placeholder="Например: 0, Unknown или 2025-01-01"
            onChange={(event) => {
              const nextValue = event.target.value;
              setFillValueInput(nextValue);
              onChange({
                ...typedConfig,
                strategy,
                fill_value: parseFillValue(nextValue),
              });
            }}
          />
        </label>
      )}

      {/* Блок выбора столбцов — полностью как в Deduplicate */}
      {uniqueAvailableColumns.length > 0 && (
        <>
          <label className={styles.checkboxAll}>
            <Checkbox.Root
              className={styles.checkboxRoot}
              checked={allColumnsMode}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateSubset([]);
                } else {
                  updateSubset(uniqueAvailableColumns);
                }
              }}
              aria-label="Применить ко всем столбцам"
            >
              <Checkbox.Indicator className={styles.checkboxIndicator}>✓</Checkbox.Indicator>
            </Checkbox.Root>
            Применить ко всем столбцам
          </label>

          <div className={styles.checkboxList}>
            {uniqueAvailableColumns.map((column) => (
              <label className={styles.checkboxItem} key={column}>
                <Checkbox.Root
                  className={styles.checkboxRoot}
                  checked={selectedSet.has(column)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateSubset([...subset, column]);
                    } else {
                      updateSubset(subset.filter((item) => item !== column));
                    }
                  }}
                  aria-label={`Выбрать столбец ${column}`}
                >
                  <Checkbox.Indicator className={styles.checkboxIndicator}>✓</Checkbox.Indicator>
                </Checkbox.Root>
                <span className={styles.checkboxText}>{column}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {uniqueAvailableColumns.length === 0 && (
        <p className={styles.muted}>Список входных столбцов пока недоступен.</p>
      )}
    </div>
  );
}
