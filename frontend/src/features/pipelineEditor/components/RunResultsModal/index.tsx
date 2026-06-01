import { createPortal } from 'react-dom';
import type { PipelineRunDetail } from '../../../../shared/api/types';
import { RunResultsCard } from '../RunResultsCard';
import styles from './index.module.scss';
import { LoadingState } from '../../../../shared/ui/LoadingState';

type RunResultsModalProps = {
  isOpen: boolean;
  run: PipelineRunDetail | null;
  isLoading?: boolean;
  onClose: () => void;
};

export function RunResultsModal({ isOpen, run, isLoading = false, onClose }: RunResultsModalProps) {
  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Результаты запуска</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalContent}>
          {isLoading && !run ? (
            <LoadingState className={styles.loadingState} spinnerSize={30} />
          ) : (
            <RunResultsCard run={run} />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
