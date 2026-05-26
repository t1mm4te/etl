import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { EmailForm } from '../../features/profile/components/EmailForm';
import { PasswordForm } from '../../features/profile/components/PasswordForm';
import { ProfileForm } from '../../features/profile/components/ProfileForm';
import { extractError } from '../../shared/lib/extractError';
import { LoadingState } from '../../shared/ui/LoadingState';
import styles from './index.module.scss';

export function ProfilePage() {
  const { data: user, isLoading, isError, error } = useCurrentUser();

  return (
    <section className={styles.page}>
      {isLoading ? <LoadingState className={styles.loadingState} spinnerSize={30} /> : null}
      {isError ? (
        <p className={styles.error}>{extractError(error, 'Ошибка загрузки профиля')}</p>
      ) : null}

      {!isLoading && !isError ? (
        <div className={styles.layout}>
          <ProfileForm user={user} />

          <div className={styles.rightColumn}>
            <PasswordForm />
            <EmailForm user={user} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
