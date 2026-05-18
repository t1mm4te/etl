import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { extractError } from '../../shared/lib/extractError';
import { ProfileFormSection } from './sections/ProfileFormSection';
import { PasswordFormSection } from './sections/PasswordFormSection';
import { EmailFormSection } from './sections/EmailFormSection';
import styles from './index.module.scss';

export function ProfilePage() {
  const { data: user, isLoading, isError, error } = useCurrentUser();

  return (
    <section className={styles.page}>
      {isLoading ? <p className={styles.muted}>Загрузка профиля...</p> : null}
      {isError ? (
        <p className={styles.error}>{extractError(error, 'Ошибка загрузки профиля')}</p>
      ) : null}

      {!isLoading && !isError ? (
        <div className={styles.layout}>
          <ProfileFormSection user={user} />

          <div className={styles.rightColumn}>
            <PasswordFormSection />
            <EmailFormSection user={user} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
