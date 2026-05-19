import type { PreviewResponse } from '../../../../shared/api/types';
import styles from './index.module.scss';

type PreviewTableProps = {
  preview: PreviewResponse;
};

export function PreviewTable({ preview }: PreviewTableProps) {
  return (
    <div className={styles.previewTableWrapper}>
      <table>
        <thead>
          <tr>
            {preview.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.data.map((row, index) => (
            <tr key={index}>
              {preview.columns.map((column) => (
                <td key={`${index}-${column}`}>{String(row[column] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
