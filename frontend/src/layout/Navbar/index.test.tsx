import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navbarMocks = vi.hoisted(() => ({
  isAuthorized: false,
  user: null as null | { avatar?: string | null; username?: string },
  logout: vi.fn(),
}));

vi.mock('../../features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { isAuthorized: boolean }) => unknown) =>
    selector({ isAuthorized: navbarMocks.isAuthorized }),
}));

vi.mock('../../features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: navbarMocks.user }),
}));

vi.mock('../../features/auth/hooks/useLogout', () => ({
  useLogout: () => ({ mutate: navbarMocks.logout }),
}));

vi.mock('../../shared/lib/getUserInitials', () => ({
  getUserInitials: (user: { username?: string } | null) => user?.username?.slice(0, 2).toUpperCase() ?? '',
}));

vi.mock('../../shared/lib/resolveMediaUrl', () => ({
  resolveMediaUrl: (url?: string | null) => url ?? null,
}));

import { Navbar } from './index';

describe('Navbar', () => {
  beforeEach(() => {
    navbarMocks.isAuthorized = false;
    navbarMocks.user = null;
    navbarMocks.logout.mockReset();
  });

  it('shows auth links for anonymous users', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
  });

  it('shows the user menu and logout for authorized users', async () => {
    const user = userEvent.setup();
    navbarMocks.isAuthorized = true;
    navbarMocks.user = { username: 'polina', avatar: null };

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('polina')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(navbarMocks.logout).toHaveBeenCalled();
  });
});