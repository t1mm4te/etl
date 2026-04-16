import type { NodeConfig } from '../../../../../api/types';
import styles from './index.module.scss';
import { RenameColumnsConfigEditor } from '../RenameColumnsConfigEditor/index';
import { SelectColumnsConfigEditor } from '../SelectColumnsConfigEditor/index';
import { SortConfigEditor } from '../SortConfigEditor/index';

type TransformConfigEditorProps = {
  operationType: string;
  config: NodeConfig;
  availableColumns: string[];
  onConfigChange: (config: NodeConfig) => void;
};

export function TransformConfigEditor({
  operationType,
  config,
  availableColumns,
  onConfigChange,
}: TransformConfigEditorProps) {
  return (
    <div className={styles.root}>
      {operationType === 'sort' ? (
        <SortConfigEditor config={config} availableColumns={availableColumns} onChange={onConfigChange} />
      ) : null}

      {operationType === 'select_columns' ? (
        <SelectColumnsConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
      ) : null}

      {operationType === 'rename_columns' ? (
        <RenameColumnsConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
      ) : null}

      {operationType !== 'sort' &&
      operationType !== 'select_columns' &&
      operationType !== 'rename_columns' ? (
        <p className={styles.muted}>Форма для этой операции пока не реализована.</p>
      ) : null}
    </div>
  );
}
