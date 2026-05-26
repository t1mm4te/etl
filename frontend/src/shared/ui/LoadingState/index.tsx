import cn from 'classnames';
import { Spinner } from '../Spinner';
import styles from './index.module.scss';

type LoadingStateProps = {
  className?: string;
  spinnerSize?: number;
};

export function LoadingState({ className, spinnerSize = 28 }: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-live="polite" className={cn(styles.root, className)} role="status">
      <div className={styles.content}>
        <Spinner size={spinnerSize} />
      </div>
    </div>
  );
}
