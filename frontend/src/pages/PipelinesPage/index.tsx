import { CreatePipelineForm } from '../../features/pipelines/components/CreatePipelineForm';
import { PipelinesList } from '../../features/pipelines/components/PipelinesList';
import styles from './index.module.scss';

export function PipelinesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Мои пайплайны</h1>
        <p className={styles.headerSubtitle}>
          Создавайте и редактируйте ETL-процессы в визуальном редакторе.
        </p>
      </header>
      <div className={styles.container}>
        <CreatePipelineForm />
        <PipelinesList />
      </div>
    </main>
  );
}
