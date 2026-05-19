import { Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar';
import styles from './index.module.scss';

export function MainLayout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
