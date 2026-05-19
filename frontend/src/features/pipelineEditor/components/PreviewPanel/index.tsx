import { useState } from 'react';
import type { PreviewResponse } from '../../../../shared/api/types';
import { CustomSelect, type SelectOption } from '../../../../shared/ui/CustomSelect';
import { PreviewTable } from '../PreviewTable';
import styles from './index.module.scss';

type PreviewTab = 'input' | 'left_input' | 'right_input' | 'result';

type PreviewPanelProps = {
  previewState: {
    inputPreview: PreviewResponse | null;
    leftInputPreview: PreviewResponse | null;
    rightInputPreview: PreviewResponse | null;
    resultPreview: PreviewResponse | null;
    isPreviewLoading: boolean;
  };
  nodeKind: 'source' | 'transform' | 'sink';
  hasIncomingData?: boolean;
  isJoin?: boolean;
  inputNodeLabelsByPort?: Record<string, string>;
  previewRowLimit: number;
  onPreviewRowLimitChange: (value: number) => void;
};

export function PreviewPanel({
  previewState,
  nodeKind,
  hasIncomingData = true,
  isJoin = false,
  inputNodeLabelsByPort,
  previewRowLimit,
  onPreviewRowLimitChange,
}: PreviewPanelProps) {
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('input');

  const { inputPreview, leftInputPreview, rightInputPreview, resultPreview, isPreviewLoading } =
    previewState;

  const rowLimitOptions: SelectOption[] = [
    { value: '10', label: '10 строк' },
    { value: '25', label: '25 строк' },
    { value: '50', label: '50 строк' },
    { value: '100', label: '100 строк' },
    { value: '500', label: '500 строк' },
  ];

  if (nodeKind === 'source') {
    return (
      <section className={styles.previewPanel}>
        {isPreviewLoading ? <p className={styles.muted}>Загружаем предпросмотр...</p> : null}

        {resultPreview ? (
          <>
            <div className={styles.metadataRow}>
              <p className={styles.metadata}>
                Всего строк: {resultPreview.total_rows} | Столбцов: {resultPreview.columns.length}
              </p>
              <CustomSelect
                options={rowLimitOptions}
                value={rowLimitOptions.find((opt) => opt.value === String(previewRowLimit))}
                onChange={(option) => {
                  const selectedOption = Array.isArray(option) ? option[0] : option;

                  if (selectedOption) {
                    onPreviewRowLimitChange(Number(selectedOption.value));
                  }
                }}
                isSearchable={false}
                isClearable={false}
                className={styles.rowLimitSelect}
              />
            </div>
            <div className={styles.tabRow}>
              <button type="button" className={styles.tabActive}>
                Результат узла
              </button>
            </div>
            <PreviewTable preview={resultPreview} />
          </>
        ) : (
          <p className={styles.muted}>Предпросмотр источника пока недоступен.</p>
        )}
      </section>
    );
  }

  // Transform/Sink node: show multiple tabs
  return (
    <section className={styles.previewPanel}>
      {!hasIncomingData ? (
        <p className={styles.muted}>Нет входных данных. Подведите стрелку к входу узла.</p>
      ) : (
        <>
          {(inputPreview || leftInputPreview || rightInputPreview || resultPreview) && (
            <div className={styles.metadataRow}>
              <p className={styles.metadata}>
                {activePreviewTab === 'input'
                  ? `Всего строк: ${inputPreview?.total_rows ?? 0} | Столбцов: ${inputPreview?.columns.length ?? 0}`
                  : activePreviewTab === 'left_input'
                    ? `Всего строк: ${leftInputPreview?.total_rows ?? 0} | Столбцов: ${leftInputPreview?.columns.length ?? 0}`
                    : activePreviewTab === 'right_input'
                      ? `Всего строк: ${rightInputPreview?.total_rows ?? 0} | Столбцов: ${rightInputPreview?.columns.length ?? 0}`
                      : `Всего строк: ${resultPreview?.total_rows ?? 0} | Столбцов: ${resultPreview?.columns.length ?? 0}`}
              </p>
              <CustomSelect
                options={rowLimitOptions}
                value={rowLimitOptions.find((opt) => opt.value === String(previewRowLimit))}
                onChange={(option) => {
                  const selectedOption = Array.isArray(option) ? option[0] : option;

                  if (selectedOption) {
                    onPreviewRowLimitChange(Number(selectedOption.value));
                  }
                }}
                isSearchable={false}
                isClearable={false}
                className={styles.rowLimitSelect}
              />
            </div>
          )}

          <div className={styles.tabRow}>
            <button
              type="button"
              className={activePreviewTab === 'result' ? styles.tabActive : styles.tab}
              onClick={() => setActivePreviewTab('result')}
            >
              Результат узла
            </button>

            {isJoin ? (
              <>
                <button
                  type="button"
                  className={activePreviewTab === 'left_input' ? styles.tabActive : styles.tab}
                  onClick={() => setActivePreviewTab('left_input')}
                >
                  {inputNodeLabelsByPort?.left ?? inputNodeLabelsByPort?.main ?? 'Вход 1'}
                </button>
                <button
                  type="button"
                  className={activePreviewTab === 'right_input' ? styles.tabActive : styles.tab}
                  onClick={() => setActivePreviewTab('right_input')}
                >
                  {inputNodeLabelsByPort?.right ?? 'Вход 2'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={activePreviewTab === 'input' ? styles.tabActive : styles.tab}
                onClick={() => setActivePreviewTab('input')}
              >
                Входные данные
              </button>
            )}
          </div>

          {isPreviewLoading ? <p className={styles.muted}>Загружаем предпросмотр...</p> : null}

          {activePreviewTab === 'input' ? (
            inputPreview ? (
              <PreviewTable preview={inputPreview} />
            ) : (
              <p className={styles.muted}>Входной предпросмотр недоступен.</p>
            )
          ) : activePreviewTab === 'left_input' ? (
            leftInputPreview ? (
              <PreviewTable preview={leftInputPreview} />
            ) : (
              <p className={styles.muted}>Предпросмотр первого входа недоступен.</p>
            )
          ) : activePreviewTab === 'right_input' ? (
            rightInputPreview ? (
              <PreviewTable preview={rightInputPreview} />
            ) : (
              <p className={styles.muted}>Предпросмотр второго входа недоступен.</p>
            )
          ) : resultPreview ? (
            <PreviewTable preview={resultPreview} />
          ) : (
            <p className={styles.muted}>Результат пока недоступен. Нажмите «Применить».</p>
          )}
        </>
      )}
    </section>
  );
}
