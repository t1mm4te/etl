import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './index.module.scss';

export type InputProps = ComponentPropsWithoutRef<'input'> & {
  isInvalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', isInvalid = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`${styles.input} ${isInvalid ? styles.invalid : ''} ${className}`.trim()}
    />
  );
});
