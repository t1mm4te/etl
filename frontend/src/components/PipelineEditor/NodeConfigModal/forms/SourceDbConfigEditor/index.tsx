import { Button } from '../../../../Button';
import styles from './index.module.scss';
import type { SourceDbConfigEditorProps } from '../types';

export function SourceDbConfigEditor({ datasourceId }: SourceDbConfigEditorProps) {
  return (
    <>
      <p className={styles.muted}>Источник БД пока в разработке.</p>
      {datasourceId ? <p className={styles.muted}>DataSource ID: {datasourceId}</p> : null}

      <Button type="button" color="white" disabled>
        Подключить БД (скоро)
      </Button>
    </>
  );
}
