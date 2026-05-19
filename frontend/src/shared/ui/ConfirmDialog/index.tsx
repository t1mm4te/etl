import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import styles from './index.module.scss';

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
        </div>
        <div className={styles.modalContent}>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.modalFooter}>
          <Button type="button" onClick={onCancel} disabled={isLoading} color="white">
            {cancelText}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isLoading} color="green">
            {isLoading ? 'Загружаем...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
