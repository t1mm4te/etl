import { useRef, useCallback } from 'react';
import styles from './index.module.scss';
import type { OperationConfigEditorProps } from '../types';
import { Input } from '../../../../../../shared/ui/Input';
import { Button } from '../../../../../../shared/ui/Button'; // убедитесь, что компонент существует
import { Textarea } from '../../../../../../shared/ui/Textarea';

const OPERATORS = [
  { label: '+', value: ' + ' },
  { label: '-', value: ' - ' },
  { label: '*', value: ' * ' },
  { label: '/', value: ' / ' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: '>', value: ' > ' },
  { label: '<', value: ' < ' },
  { label: '=', value: ' = ' },
];

export function ComputedColumnConfigEditor({
  config,
  availableColumns,
  onChange,
}: OperationConfigEditorProps) {
  const typedConfig = config as Record<string, unknown>;
  const newColumn = typeof typedConfig.new_column === 'string' ? typedConfig.new_column : '';
  const expression = typeof typedConfig.expression === 'string' ? typedConfig.expression : '';

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? expression.length;
      const end = textarea.selectionEnd ?? expression.length;

      const newExpression = expression.substring(0, start) + text + expression.substring(end);

      onChange({
        ...typedConfig,
        expression: newExpression,
      });

      // Восстанавливаем позицию курсора после вставки
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
    },
    [expression, typedConfig, onChange]
  );

  return (
    <div className={styles.root}>
      <label className={styles.configLabel}>
        Имя нового столбца
        <Input
          value={newColumn}
          placeholder="Например: total_amount"
          onChange={(e) => onChange({ ...typedConfig, new_column: e.target.value.trim() })}
        />
      </label>
      <label className={styles.configLabel}>
        Выражение
        <Textarea
          ref={textareaRef}
          className={styles.expressionInput}
          value={expression}
          placeholder="Например: price * quantity * (1 - discount)"
          onChange={(e) => onChange({ ...typedConfig, expression: e.target.value })}
          rows={6}
          spellCheck={false}
        />
      </label>
      <div className={styles.configLabel}>
        <span>Доступные столбцы</span>
        <div className={styles.builderPanel}>
          <div className={styles.columnsList}>
            {availableColumns.map((col) => (
              <Button key={col} onClick={() => insertText(col)}>
                {col}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.configLabel}>
        <span>Доступные операторы</span>{' '}
        <div className={styles.builderPanel}>
          <div className={styles.operators}>
            {OPERATORS.map((op) => (
              <Button key={op.label} color="white" onClick={() => insertText(op.value)}>
                {op.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
