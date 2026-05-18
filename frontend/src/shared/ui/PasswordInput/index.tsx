import { useState } from 'react';
import type { ChangeEventHandler, FocusEventHandler } from 'react';
import styles from './index.module.scss';

interface PasswordInputProps {
  id: string;
  label: string;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  name?: string;
}

export function PasswordInput({ label, id, error, disabled, autoComplete, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className={styles.label} htmlFor={id}>
      {label}
      <div className={styles.wrapper}>
        <input
          {...props}
          id={id}
          className={`${styles.input} ${error ? styles.invalid : ''}`}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          className={styles.toggle}
          onClick={() => setVisible((state) => !state)}
          type="button"
          disabled={disabled}
        >
          {visible ? 'Скрыть' : 'Показать'}
        </button>
      </div>
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
