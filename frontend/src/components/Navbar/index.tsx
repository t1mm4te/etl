import { Link, NavLink } from 'react-router-dom';
import { Button, LinkButton } from '../Button';
import { useLogoutAction } from '../../hooks/useAuthActions';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.svg';
import styles from './index.module.scss';

export function Navbar() {
  const isAuthorized = useAuthStore((state) => state.isAuthorized);
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogoutAction();

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
                {user?.username ?? 'Пользователь'}
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
