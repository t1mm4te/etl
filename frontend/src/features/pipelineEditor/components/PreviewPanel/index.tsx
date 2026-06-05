import { useState } from 'react';
import type { PreviewResponse } from '../../../../shared/api/types';
import { CustomSelect, type SelectOption } from '../../../../shared/ui/CustomSelect';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import { PreviewTable } from '../PreviewTable';
import styles from './index.module.scss';
import type { NodeKind, PreviewTab } from '../../types/nodeConfigModalTypes';

type PreviewPanelProps = {
  previewState: {
    inputPreview: PreviewResponse | null;
    leftInputPreview: PreviewResponse | null;
    rightInputPreview: PreviewResponse | null;
    resultPreview: PreviewResponse | null;
    isPreviewLoading: boolean;
  };
  nodeKind: NodeKind;
  hasIncomingData?: boolean;
  isJoin?: boolean;
  inputNodeLabelsByPort?: Record<string, string>;
  previewRowLimit: number;
  onPreviewRowLimitChange: (value: number) => void;
  activePreviewTab?: PreviewTab;
  onActivePreviewTabChange?: (tab: PreviewTab) => void;
  noIncomingDataHeightPx?: number;
};

export function PreviewPanel({
  previewState,
  nodeKind,
  hasIncomingData = true,
  isJoin = false,
  inputNodeLabelsByPort,
  previewRowLimit,
  onPreviewRowLimitChange,
  activePreviewTab,
  onActivePreviewTabChange,
  noIncomingDataHeightPx = 740,
}: PreviewPanelProps) {
  const [localPreviewTab, setLocalPreviewTab] = useState<PreviewTab>('input');
  const currentPreviewTab = activePreviewTab ?? localPreviewTab;

  const setTab = (tab: PreviewTab) => {
    setLocalPreviewTab(tab);
    onActivePreviewTabChange?.(tab);
  };

  const { inputPreview, leftInputPreview, rightInputPreview, resultPreview, isPreviewLoading } =
    previewState;

  const rowLimitOptions: SelectOption[] = [
    { value: '15', label: '15 строк' },
    { value: '30', label: '30 строк' },
    { value: '50', label: '50 строк' },
    { value: '100', label: '100 строк' },
    { value: '500', label: '500 строк' },
  ];

  const renderEmptyState = (message: string) => (
    <div className={styles.emptyState}>
      <p className={styles.emptyStateText}>{message}</p>
    </div>
  );

  const hasAnyPreview = !!(inputPreview || leftInputPreview || rightInputPreview || resultPreview);

  if (nodeKind === 'source') {
    return (
      <section className={styles.previewPanel}>
        <div className={styles.metadataRow}>
          <p className={styles.metadata}>
            {resultPreview
              ? `Всего ${resultPreview.total_rows} строк, ${resultPreview.columns.length} столбцов`
              : ''}
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
        <div className={styles.previewBody}>
          {resultPreview ? <PreviewTable preview={resultPreview} /> : null}
          {isPreviewLoading ? (
            <LoadingState className={styles.loadingState} spinnerSize={30} />
          ) : resultPreview ? null : (
            renderEmptyState('Предпросмотр источника пока недоступен.')
          )}
        </div>
      </section>
    );
  }

  if (nodeKind == 'sink') {
    return (
      <section className={styles.previewPanel}>
        <div className={styles.metadataRow}>
          <p className={styles.metadata}>
            {inputPreview
              ? `Всего ${inputPreview.total_rows} строк, ${inputPreview.columns.length} столбцов`
              : ''}
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
        <div className={styles.previewBody}>
          {inputPreview ? <PreviewTable preview={inputPreview} /> : null}
          {isPreviewLoading ? (
            <LoadingState className={styles.loadingState} spinnerSize={30} />
          ) : inputPreview ? null : (
            renderEmptyState('Предпросмотр источника пока недоступен.')
          )}
        </div>
      </section>
    );
  }

  // Transform node: show multiple tabs
  return (
    <section className={styles.previewPanel}>
      {!hasIncomingData ? (
        <div
          className={`${styles.previewBody} ${styles.previewBodyStandalone}`}
          style={{ minHeight: `${noIncomingDataHeightPx}px` }}
        >
          <div className={styles.emptyState} style={{ minHeight: `${noIncomingDataHeightPx}px` }}>
            <p className={styles.emptyStateText}>
              Нет входных данных. Подведите стрелку к входу узла.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.metadataRow}>
            <p className={styles.metadata}>
              {currentPreviewTab === 'input'
                ? `Всего ${inputPreview?.total_rows ?? 0} строк, ${inputPreview?.columns.length ?? 0} столбцов`
                : currentPreviewTab === 'left_input'
                  ? `Всего ${leftInputPreview?.total_rows ?? 0} строк, ${leftInputPreview?.columns.length ?? 0} столбцов`
                  : currentPreviewTab === 'right_input'
                    ? `Всего ${rightInputPreview?.total_rows ?? 0} строк, ${rightInputPreview?.columns.length ?? 0} столбцов`
                    : `Всего ${resultPreview?.total_rows ?? 0} строк, ${resultPreview?.columns.length ?? 0} столбцов`}
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
              isDisabled={!hasAnyPreview}
            />
          </div>

          <div className={styles.tabRow}>
            <button
              type="button"
              className={currentPreviewTab === 'result' ? styles.tabActive : styles.tab}
              onClick={() => setTab('result')}
            >
              Результат узла
            </button>

            {isJoin ? (
              <>
                <button
                  type="button"
                  className={currentPreviewTab === 'left_input' ? styles.tabActive : styles.tab}
                  onClick={() => setTab('left_input')}
                >
                  {inputNodeLabelsByPort?.left ?? inputNodeLabelsByPort?.main ?? 'Вход 1'}
                </button>
                <button
                  type="button"
                  className={currentPreviewTab === 'right_input' ? styles.tabActive : styles.tab}
                  onClick={() => setTab('right_input')}
                >
                  {inputNodeLabelsByPort?.right ?? 'Вход 2'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={currentPreviewTab === 'input' ? styles.tabActive : styles.tab}
                onClick={() => setTab('input')}
              >
                Входные данные
              </button>
            )}
          </div>

          <div className={styles.previewBody}>
            {currentPreviewTab === 'input' ? (
              inputPreview ? (
                <PreviewTable preview={inputPreview} />
              ) : null
            ) : currentPreviewTab === 'left_input' ? (
              leftInputPreview ? (
                <PreviewTable preview={leftInputPreview} />
              ) : null
            ) : currentPreviewTab === 'right_input' ? (
              rightInputPreview ? (
                <PreviewTable preview={rightInputPreview} />
              ) : null
            ) : resultPreview ? (
              <PreviewTable preview={resultPreview} />
            ) : null}

            {isPreviewLoading ? (
              <LoadingState className={styles.loadingState} spinnerSize={30} />
            ) : currentPreviewTab === 'input' ? (
              inputPreview ? null : (
                renderEmptyState('Входной предпросмотр недоступен.')
              )
            ) : currentPreviewTab === 'left_input' ? (
              leftInputPreview ? null : (
                renderEmptyState('Предпросмотр первого входа недоступен.')
              )
            ) : currentPreviewTab === 'right_input' ? (
              rightInputPreview ? null : (
                renderEmptyState('Предпросмотр второго входа недоступен.')
              )
            ) : resultPreview ? null : (
              renderEmptyState('Результат пока недоступен. Нажмите «Применить».')
            )}
          </div>
        </>
      )}
    </section>
  );
}
