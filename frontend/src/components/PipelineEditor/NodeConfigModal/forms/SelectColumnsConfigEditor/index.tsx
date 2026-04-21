import { Checkbox } from '@base-ui/react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';

function getColumns(config: Record<string, unknown>) {
  const raw = config.columns;
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed = raw.map((item) => (typeof item === 'string' ? item : String(item ?? '')));
  return parsed.map((item) => item.trim()).filter((item) => item.length > 0);
}

type SortableSelectedColumnItemProps = {
  column: string;
  onToggle: (column: string, checked: boolean) => void;
};

function SortableSelectedColumnItem({ column, onToggle }: SortableSelectedColumnItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: column });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.checkboxItem}
      data-dragging={isDragging ? 'true' : 'false'}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        aria-label={`Переместить столбец ${column}`}
        {...attributes}
        {...listeners}
      >
        ::
      </button>

      <Checkbox.Root
        className={styles.checkboxRoot}
        checked
        onCheckedChange={(checked) => onToggle(column, checked)}
        aria-label={`Выбрать столбец ${column}`}
      >
        <Checkbox.Indicator className={styles.checkboxIndicator}>✓</Checkbox.Indicator>
      </Checkbox.Root>

      <span className={styles.checkboxText}>{column}</span>
    </div>
  );
}

export function SelectColumnsConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const selectedColumns = getColumns(typedConfig);
  const uniqueAvailableColumns = Array.from(new Set(availableColumns));
  const availableSet = new Set(uniqueAvailableColumns);
  const selectedAvailableColumns = selectedColumns.filter((column) => availableSet.has(column));
  const selectedSet = new Set(selectedAvailableColumns);
  const allSelected =
    uniqueAvailableColumns.length > 0 &&
    uniqueAvailableColumns.every((column) => selectedSet.has(column));
  const extraSelectedColumns = selectedColumns.filter((column) => !availableSet.has(column));
  const unselectedAvailableColumns = uniqueAvailableColumns.filter((column) => !selectedSet.has(column));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const updateColumns = (nextColumns: string[]) => {
    const nextConfig: Record<string, unknown> = {
      ...typedConfig,
      columns: nextColumns,
    };
    onChange(nextConfig);
  };

  const onSelectAllToggle = (checked: boolean) => {
    if (!checked) {
      updateColumns([]);
      return;
    }

    updateColumns([...uniqueAvailableColumns, ...extraSelectedColumns]);
  };

  const onColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      if (selectedSet.has(column)) {
        return;
      }

      updateColumns([...selectedAvailableColumns, column, ...extraSelectedColumns]);
      return;
    }

    updateColumns(selectedColumns.filter((item) => item !== column));
  };

  const onSelectedColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = selectedAvailableColumns.indexOf(String(active.id));
    const newIndex = selectedAvailableColumns.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(selectedAvailableColumns, oldIndex, newIndex);
    updateColumns([...reordered, ...extraSelectedColumns]);
  };

  return (
    <div className={styles.root}>
      <p className={styles.title}>Выбор столбцов</p>

      {uniqueAvailableColumns.length === 0 ? (
        <p className={styles.muted}>Список входных столбцов пока недоступен.</p>
      ) : (
        <>
          <div className={styles.controlsRow}>
            <label className={styles.checkboxAll}>
              <Checkbox.Root
                className={styles.checkboxRoot}
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAllToggle(checked)}
                aria-label="Отметить все столбцы"
              >
                <Checkbox.Indicator className={styles.checkboxIndicator}>✓</Checkbox.Indicator>
              </Checkbox.Root>
              Отметить все
            </label>

            <button type="button" className={styles.controlButton} onClick={() => updateColumns([])}>
              Очистить
            </button>
          </div>

          <p className={styles.sectionTitle}>Выбранные (можно перетаскивать)</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSelectedColumnDragEnd}>
            <SortableContext items={selectedAvailableColumns} strategy={verticalListSortingStrategy}>
              <div className={styles.checkboxList}>
                {selectedAvailableColumns.length > 0 ? (
                  selectedAvailableColumns.map((column) => (
                    <SortableSelectedColumnItem
                      key={column}
                      column={column}
                      onToggle={onColumnToggle}
                    />
                  ))
                ) : (
                  <p className={styles.muted}>Ни один столбец еще не выбран.</p>
                )}
              </div>
            </SortableContext>
          </DndContext>

          <p className={styles.sectionTitle}>Доступные для выбора</p>
          <div className={styles.checkboxList}>
            {unselectedAvailableColumns.map((column) => (
              <label className={styles.checkboxItem} key={column}>
                <Checkbox.Root
                  className={styles.checkboxRoot}
                  checked={false}
                  onCheckedChange={(checked) => onColumnToggle(column, checked)}
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

      {extraSelectedColumns.length > 0 ? (
        <p className={styles.muted}>
          Выбраны столбцы, которых нет во входных данных: {extraSelectedColumns.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
