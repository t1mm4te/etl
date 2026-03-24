import styles from './index.module.scss';

export function DashboardPage() {
  return (
    <main className={styles.page}>
      <h1>Dashboard</h1>
      <p>Вы вошли в систему. Здесь будет рабочее пространство пайплайнов.</p>
    </main>
  );
}
