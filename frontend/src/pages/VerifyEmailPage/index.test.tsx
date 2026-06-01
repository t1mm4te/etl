import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const verifyMocks = vi.hoisted(() => ({
  verify: vi.fn(),
  resend: vi.fn(),
  isPending: false,
}));

vi.mock('../../features/auth/hooks/useVerifyEmail', () => ({
  useVerifyEmail: () => ({
    mutateAsync: verifyMocks.verify,
    isPending: verifyMocks.isPending,
  }),
}));

vi.mock('../../features/auth/hooks/useResendCode', () => ({
  useResendCode: () => ({
    mutateAsync: verifyMocks.resend,
    isPending: verifyMocks.isPending,
  }),
}));

import { VerifyEmailPage } from './index';

describe('VerifyEmailPage', () => {
  it('renders the form when no email is prefilled', () => {
    render(
      <MemoryRouter initialEntries={['/verify-email']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Подтверждение email' })).toBeInTheDocument();
    expect(screen.getByText(/Введите почту, которую указали при регистрации/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeInTheDocument();
  });

  it('renders the prefilled email state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'a@b.com' } }]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Код отправлен на/)).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });
});