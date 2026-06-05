import type { PreviewResponse } from '../../../../shared/api/types';
import styles from './index.module.scss';
import { useRef, useEffect } from 'react';

type PreviewTableProps = {
  preview: PreviewResponse;
};

export function PreviewTable({ preview }: PreviewTableProps) {
  const theadRef = useRef<HTMLTableSectionElement>(null);

  // Опционально: добавляем класс для тени при скролле
  useEffect(() => {
    const wrapper = document.querySelector(`.${styles.previewTableWrapper}`);
    const thead = theadRef.current;

    if (!wrapper || !thead) return;

    const handleScroll = () => {
      if (wrapper.scrollTop > 0) {
        thead.classList.add(styles.scrolled);
      } else {
        thead.classList.remove(styles.scrolled);
      }
    };

    wrapper.addEventListener('scroll', handleScroll);
    return () => wrapper.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.previewTableWrapper}>
      <table>
        <thead ref={theadRef}>
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
