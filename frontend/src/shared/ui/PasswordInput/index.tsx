import { useState } from 'react';
import type { ChangeEventHandler, FocusEventHandler } from 'react';
import { Input } from '../Input';
import styles from './index.module.scss';

interface PasswordInputProps {
  id: string;
  label: string;
  error?: string;
  isInvalid?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  name?: string;
}

export function PasswordInput({
  label,
  id,
  error,
  isInvalid,
  disabled,
  autoComplete,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className={styles.label} htmlFor={id}>
      {label}
      <div className={styles.wrapper}>
        <Input
          {...props}
          id={id}
          className={styles.input}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
          isInvalid={Boolean(error) || Boolean(isInvalid)}
        />
        <button
          className={styles.toggle}
          onClick={() => setVisible((state) => !state)}
          type="button"
          disabled={disabled}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        >
          <span
            className={`${styles.icon} ${visible ? styles.iconSeen : styles.iconHidden}`}
            aria-hidden="true"
          />
        </button>
      </div>
      {error && !isInvalid ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
