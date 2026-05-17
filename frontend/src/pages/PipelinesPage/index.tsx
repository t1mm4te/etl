import styles from './index.module.scss';
import { CreatePipelineSection } from './sections/CreatePipelineSection';
import { PipelinesListSection } from './sections/PipelinesListSection';

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
        <CreatePipelineSection />
        <PipelinesListSection />
      </div>
    </main>
  );
}
