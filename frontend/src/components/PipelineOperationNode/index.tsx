import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import calculateIcon from '../../assets/node-icons/calculate.svg';
import columnsIcon from '../../assets/node-icons/columns.svg';
import databaseIcon from '../../assets/node-icons/database.svg';
import defaultIcon from '../../assets/node-icons/default.svg';
import excelIcon from '../../assets/node-icons/excel.svg';
import loadIcon from '../../assets/node-icons/load.svg';
import rowsIcon from '../../assets/node-icons/rows.svg';
import tableIcon from '../../assets/node-icons/table.svg';
import trashIcon from '../../assets/node-icons/trash.svg';
import styles from './index.module.scss';

export type PipelineOperationNodeData = {
  label: string;
  operationType: string;
  category?: string;
  inputPorts?: string[];
  onDelete?: (nodeId: string) => void;
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

function resolveIcon(data: PipelineOperationNodeData) {
  return (
    iconByOperation[data.operationType] ??
    (data.category ? iconByCategory[data.category] : undefined) ??
    defaultIcon
  );
}

export function PipelineOperationNode({
  data,
  id,
  selected,
}: NodeProps<PipelineOperationNodeData>) {
  const icon = resolveIcon(data);
  const inputPorts = data.inputPorts ?? [];
  const showOutputHandle = data.category !== 'load';

  const getTargetHandleTop = (index: number) => {
    if (inputPorts.length <= 1) {
      return '50%';
    }
    const start = 28;
    const end = 72;
    const ratio = index / (inputPorts.length - 1);
    return `${start + (end - start) * ratio}%`;
  };

  return (
    <div className={styles.nodeWrap}>
      <div className={`${styles.node} ${selected ? styles.selected : ''}`}>
        {inputPorts.map((port, index) => (
          <Handle
            key={port}
            className={styles.handle}
            id={port}
            position={Position.Left}
            style={{ top: getTargetHandleTop(index) }}
            type="target"
          />
        ))}
        <div className={styles.label}>{data.label}</div>
        <img alt={data.operationType} src={icon} />
        {showOutputHandle ? (
          <Handle className={styles.handle} id="output" position={Position.Right} type="source" />
        ) : null}
      </div>

      <button
        className={`nodrag nopan ${styles.deleteButton}`}
        onClick={() => data.onDelete?.(id)}
        title="Удалить ноду"
        type="button"
      >
        <img alt="Удалить" src={trashIcon} />
      </button>
    </div>
  );
}
