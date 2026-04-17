import type { NodeConfig } from '../../../../../api/types';
import styles from './index.module.scss';
import { DeduplicateConfigEditor } from '../DeduplicateConfigEditor/index';
import { FilterRowsConfigEditor } from '../FilterRowsConfigEditor/index';
import { MergeColumnsConfigEditor } from '../MergeColumnsConfigEditor/index';
import { RenameColumnsConfigEditor } from '../RenameColumnsConfigEditor/index';
import { SelectColumnsConfigEditor } from '../SelectColumnsConfigEditor/index';
import { SortConfigEditor } from '../SortConfigEditor/index';
import { SplitColumnConfigEditor } from '../SplitColumnConfigEditor/index';

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
        <SortConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
      ) : null}

      {operationType === 'filter_rows' ? (
        <FilterRowsConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
      ) : null}

      {operationType === 'deduplicate' ? (
        <DeduplicateConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
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

      {operationType === 'split_column' ? (
        <SplitColumnConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
      ) : null}

      {operationType === 'merge_columns' ? (
        <MergeColumnsConfigEditor
          config={config}
          availableColumns={availableColumns}
          onChange={onConfigChange}
        />
      ) : null}

      {operationType !== 'sort' &&
      operationType !== 'filter_rows' &&
      operationType !== 'deduplicate' &&
      operationType !== 'select_columns' &&
      operationType !== 'rename_columns' &&
      operationType !== 'split_column' &&
      operationType !== 'merge_columns' ? (
        <p className={styles.muted}>Форма для этой операции пока не реализована.</p>
      ) : null}
    </div>
  );
}
