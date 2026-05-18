import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './index.module.scss';

interface AuthShellProps {
  title: string;
  errorText?: string;
  successText?: string;
  footerText: string;
  footerLinkText: string;
  footerTo: string;
  children: ReactNode;
}

export function AuthShell({
  title,
  errorText,
  successText,
  footerText,
  footerLinkText,
  footerTo,
  children,
}: AuthShellProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>{title}</h1>

        {successText && <div className={`${styles.alert} ${styles.success}`}>{successText}</div>}

        {errorText && <div className={`${styles.alert} ${styles.error}`}>{errorText}</div>}

        {children}

        <p className={styles.footer}>
          {footerText}{' '}
          <Link className={styles.link} to={footerTo}>
            {footerLinkText}
          </Link>
        </p>
      </section>
    </main>
  );
}
