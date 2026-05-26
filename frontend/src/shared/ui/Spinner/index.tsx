import cn from 'classnames';
import styles from './index.module.scss';

type SpinnerProps = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 28, className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(styles.spinner, className)}
      style={{ width: size, height: size }}
    />
  );
}
