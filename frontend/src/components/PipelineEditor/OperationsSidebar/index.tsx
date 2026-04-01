import type { OperationCategory, OperationItem } from '../../../api/types';
import styles from './index.module.scss';
import calculateIcon from '../../../assets/node-icons/calculate.svg';
import columnsIcon from '../../../assets/node-icons/columns.svg';
import databaseIcon from '../../../assets/node-icons/database.svg';
import defaultIcon from '../../../assets/node-icons/default.svg';
import excelIcon from '../../../assets/node-icons/excel.svg';
import loadIcon from '../../../assets/node-icons/load.svg';
import rowsIcon from '../../../assets/node-icons/rows.svg';
import tableIcon from '../../../assets/node-icons/table.svg';

type OperationsSidebarProps = {
  sortedCategories: Array<[string, OperationCategory]>;
  operations: OperationItem[];
  openCategories: Record<string, boolean>;
  isLoading: boolean;
  onToggleCategory: (categoryId: string) => void;
  onCreateNode: (operation: OperationItem) => void;
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

export function OperationsSidebar({
  sortedCategories,
  operations,
  openCategories,
  isLoading,
  onToggleCategory,
  onCreateNode,
}: OperationsSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Ноды</h2>
      {isLoading ? <p className={styles.muted}>Загрузка каталога...</p> : null}

      {sortedCategories.map(([categoryId, category], index) => {
        const categoryOperations = operations.filter((item) => item.category === categoryId);
        const isOpen = openCategories[categoryId] ?? index === 0;

        return (
          <div className={styles.group} key={categoryId}>
            <button
              className={styles.groupHeader}
              type="button"
              onClick={() => onToggleCategory(categoryId)}
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
                    <strong className={styles.operationLabel}>{operation.label}</strong>
                    <div className={styles.nodeContent}>
                      <span className={styles.operationDescription}>{operation.description}</span>
                      <img alt={operation.type} src={resolveIcon(operation)} />
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
