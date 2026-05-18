import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Button, LinkButton } from '../../shared/ui/Button';
import { useLogout } from '../../hooks/useLogout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useAuthStore } from '../../store/authStore';
import { getUserInitials } from '../../lib/getUserInitials';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import logo from '../../assets/logo.svg';
import styles from './index.module.scss';

export function Navbar() {
  const isAuthorized = useAuthStore((state) => state.isAuthorized);
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  const avatarSrc = resolveMediaUrl(user?.avatar);
  const initials = getUserInitials(user);
  const [erroredAvatarSrc, setErroredAvatarSrc] = useState<string | null>(null);
  const avatarHasError = Boolean(avatarSrc) && erroredAvatarSrc === avatarSrc;

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link className={styles.logo} to="/">
          <img className={styles.logoImage} src={logo} alt="no-code ETL" />
        </Link>

        <nav className={styles.nav}>
          {isAuthorized ? (
            <>
              <NavLink
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                }
                to="/pipelines"
              >
                Мои пайплайны
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                }
                to="/profile"
              >
                <span className={styles.userLinkContent}>
                  <span className={styles.userAvatar} aria-hidden="true">
                    {avatarSrc && !avatarHasError ? (
                      <img
                        className={styles.userAvatarImage}
                        src={avatarSrc}
                        alt=""
                        onError={() => setErroredAvatarSrc(avatarSrc)}
                      />
                    ) : (
                      <span className={styles.userAvatarInitials}>{initials}</span>
                    )}
                  </span>
                  <span className={styles.userName}>{user?.username ?? 'Пользователь'}</span>
                </span>
              </NavLink>
              <Button onClick={() => logoutMutation.mutate()} type="button" color="white">
                Выйти
              </Button>
            </>
          ) : (
            <div className={styles.actions}>
              <LinkButton to="/register">Регистрация</LinkButton>
              <LinkButton to="/login" color="white">
                Войти
              </LinkButton>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
