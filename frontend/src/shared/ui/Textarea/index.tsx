import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './index.module.scss';

export type TextareaProps = ComponentPropsWithoutRef<'textarea'> & {
  isInvalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', isInvalid = false, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`${styles.textarea} ${isInvalid ? styles.invalid : ''} ${className}`.trim()}
    />
  );
});
