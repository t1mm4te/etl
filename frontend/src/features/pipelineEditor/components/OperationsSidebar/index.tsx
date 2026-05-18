import type { OperationItem } from '../../../../shared/api/types';
import { usePipelineEditorMutations } from '../../hooks/usePipelineEditorMutations';
import { usePipelineEditorQueries } from '../../hooks/usePipelineEditorQueries';
import { calculateNewNodePosition } from '../../utils/getNewNodePosition';
import { usePipelineEditorStore } from '../../../../store/pipelineEditorStore';
import calculateIcon from '../../../../assets/node-icons/calculate.svg';
import columnsIcon from '../../../../assets/node-icons/columns.svg';
import databaseIcon from '../../../../assets/node-icons/database.svg';
import defaultIcon from '../../../../assets/node-icons/default.svg';
import excelIcon from '../../../../assets/node-icons/excel.svg';
import loadIcon from '../../../../assets/node-icons/load.svg';
import rowsIcon from '../../../../assets/node-icons/rows.svg';
import tableIcon from '../../../../assets/node-icons/table.svg';
import styles from './index.module.scss';

type OperationsSidebarProps = {
  pipelineId: string;
};

const iconByCategory: Record<string, string> = {
  extract: excelIcon,
  rows: rowsIcon,
  columns: columnsIcon,
  tables: tableIcon,
  calculate: calculateIcon,
  load: loadIcon,
};

const iconByOperation: Record<string, string> = {
  source_file: excelIcon,
  source_db: databaseIcon,
};

function resolveIcon(operation: OperationItem) {
  return (
    iconByOperation[operation.type] ??
    (operation.category ? iconByCategory[operation.category] : undefined) ??
    defaultIcon
  );
}

export function OperationsSidebar({ pipelineId }: OperationsSidebarProps) {
  const { operationsQuery, sortedCategories } = usePipelineEditorQueries(pipelineId);
  const { createNodeMutation } = usePipelineEditorMutations({ pipelineId });

  const openCategories = usePipelineEditorStore((s) => s.openCategories);
  const toggleCategory = usePipelineEditorStore((s) => s.toggleCategory);
  const flowInstance = usePipelineEditorStore((s) => s.flowInstance);

  const operations = operationsQuery.data?.operations ?? [];
  const isLoading = operationsQuery.isLoading;

  const onCreateNode = (operation: OperationItem) => {
    const position = calculateNewNodePosition(flowInstance);
    void createNodeMutation.mutateAsync({ operation, position });
  };
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Операции</h2>
      <p className={styles.subtitle}>Добавьте ноду в пайплайн одним кликом</p>
      {isLoading ? <p className={styles.muted}>Загрузка каталога...</p> : null}

      {sortedCategories.map(([categoryId, category], index) => {
        const categoryOperations = operations.filter((item) => item.category === categoryId);
        const isOpen = openCategories[categoryId] ?? index === 0;

        return (
          <div className={styles.group} key={categoryId}>
            <button
              className={styles.groupHeader}
              type="button"
              onClick={() => toggleCategory(categoryId)}
            >
              <div>
                <h3 className={styles.categoryLabel}>{category.label}</h3>
                <p className={styles.categoryDescription}>{category.description}</p>
              </div>
              <span className={isOpen ? styles.groupChevronOpen : styles.groupChevron}>▾</span>
            </button>

            {isOpen ? (
              <div className={styles.groupItems}>
                {categoryOperations.map((operation) => (
                  <button
                    className={styles.nodeButton}
                    key={operation.type}
                    type="button"
                    onClick={() => onCreateNode(operation)}
                  >
                    <div className={styles.nodeContent}>
                      <div className={styles.nodeText}>
                        <strong className={styles.operationLabel}>{operation.label}</strong>
                        <span className={styles.operationDescription}>{operation.description}</span>
                      </div>
                      <img
                        className={styles.operationIcon}
                        alt={operation.type}
                        src={resolveIcon(operation)}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
