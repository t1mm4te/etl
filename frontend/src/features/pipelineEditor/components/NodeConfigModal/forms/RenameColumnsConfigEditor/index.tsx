import { Button } from '../../../../../../shared/ui/Button';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Input } from '../../../../../../shared/ui/Input';

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
  const rows = rowsFromConfig(typedConfig);

  const sourceOptions: SelectOption[] = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));

  const updateRows = (nextRows: RenameRow[]) => {
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
    updateRows(rows.filter((_, i) => i !== index));
  };

  const updateSource = (index: number, value: string) => {
    const nextRows = [...rows];
    nextRows[index] = { ...nextRows[index], source: value };
    updateRows(nextRows);
  };

  const updateTarget = (index: number, value: string) => {
    const nextRows = [...rows];
    nextRows[index] = { ...nextRows[index], target: value };
    updateRows(nextRows);
  };

  // Запрет повторного выбора одного и того же исходного столбца
  const getAvailableSourceOptions = (currentIndex: number) => {
    const usedSources = new Set(
      rows
        .filter((_, i) => i !== currentIndex)
        .map((r) => r.source)
        .filter(Boolean)
    );

    return sourceOptions.filter((option) => !usedSources.has(option.value));
  };

  return (
    <div className={styles.root}>
      {rows.map((row, index) => (
        <div className={styles.renameBlock} key={`rename-${index}`}>
          <button className={styles.closeButton} onClick={() => removeRow(index)} type="button">
            ✕
          </button>

          <div className={styles.fields}>
            <label className={styles.configLabel}>
              Исходное имя
              <CustomSelect
                options={getAvailableSourceOptions(index)}
                value={
                  sourceOptions.find((opt) => opt.value === row.source) ??
                  (row.source ? { value: row.source, label: row.source } : null)
                }
                placeholder="Выберите столбец"
                onChange={(option) =>
                  updateSource(index, (option as SelectOption | null)?.value ?? '')
                }
                isClearable
              />
            </label>

            <label className={styles.configLabel}>
              Новое имя
              <Input
                value={row.target}
                placeholder="Новое имя"
                onChange={(e) => updateTarget(index, e.target.value)}
              />
            </label>
          </div>
        </div>
      ))}

      <Button type="button" color="white" onClick={addRow}>
        + Добавить переименование
      </Button>
    </div>
  );
}
