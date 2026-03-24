import { LinkButton } from '../../components/Button';
import styles from './index.module.scss';

export function LandingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>ETL-конструктор без кода</h1>
        <p>
          Собирайте пайплайны визуально, загружайте источники и запускайте обработку в пару кликов.
        </p>
        <div className={styles.actions}>
          <LinkButton to="/register">Начать бесплатно</LinkButton>
          <LinkButton to="/login" color="white">
            Войти
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
