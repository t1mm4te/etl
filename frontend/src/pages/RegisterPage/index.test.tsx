/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RegisterPage } from './index.tsx';
import { useRegister } from '../../features/auth/hooks/useRegister';

vi.mock('../../features/auth/hooks/useRegister');

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(useRegister).mockClear();
  });

  describe('Клиентская валидация', () => {
    it('показывает ошибки валидации при пустой отправке', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.mocked(useRegister).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

      expect(await screen.findByText(/введите имя/i)).toBeInTheDocument();
      expect(await screen.findByText(/введите фамилию/i)).toBeInTheDocument();
      expect(await screen.findByText(/минимум 2 символа/i)).toBeInTheDocument();
      expect(await screen.findByText(/введите корректный email/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('показывает ошибку если пароль короче 8 символов', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.mocked(useRegister).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/имя/i), 'Иван');
      await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
      await user.type(screen.getByLabelText(/username/i), 'ivanov');
      await user.type(screen.getByLabelText(/email/i), 'ivan@test.com');
      await user.type(screen.getByLabelText(/^пароль$/i), 'short');
      await user.type(screen.getByLabelText(/подтверждение пароля/i), 'short');
      await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

      expect(await screen.findByText(/минимум 8 символов/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('показывает ошибку если пароли не совпадают', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.mocked(useRegister).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/имя/i), 'Иван');
      await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
      await user.type(screen.getByLabelText(/username/i), 'ivanov');
      await user.type(screen.getByLabelText(/email/i), 'ivan@test.com');
      await user.type(screen.getByLabelText(/^пароль$/i), 'password123');
      await user.type(screen.getByLabelText(/подтверждение пароля/i), 'different');
      await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

      expect(await screen.findByText(/пароли не совпадают/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('валидирует формат email', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.mocked(useRegister).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/имя/i), 'Иван');
      await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
      await user.type(screen.getByLabelText(/username/i), 'ivanov');
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/^пароль$/i), 'password123');
      await user.type(screen.getByLabelText(/подтверждение пароля/i), 'password123');
      await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

      expect(await screen.findByText(/введите корректный email/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  // describe('Серверные ошибки', () => {
  //   it('показывает ошибку сервера при дубликате email', async () => {
  //     const user = userEvent.setup();
  //     // ТОЧНЫЙ ответ сервера
  //     const mockMutateAsync = vi.fn().mockRejectedValue({
  //       response: {
  //         data: {
  //           email: ['Пользователь с таким Почта уже существует.'],
  //           username: ['Пользователь с таким именем уже существует.'],
  //         },
  //       },
  //     });

  //     vi.mocked(useRegister).mockReturnValue({
  //       mutateAsync: mockMutateAsync,
  //       isPending: false,
  //     } as any);

  //     render(
  //       <MemoryRouter>
  //         <RegisterPage />
  //       </MemoryRouter>
  //     );

  //     await user.type(screen.getByLabelText(/имя/i), 'Иван');
  //     await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
  //     await user.type(screen.getByLabelText(/username/i), 'ivanov');
  //     await user.type(screen.getByLabelText(/email/i), 'existing@test.com');
  //     await user.type(screen.getByLabelText(/^пароль$/i), 'password123');
  //     await user.type(screen.getByLabelText(/подтверждение пароля/i), 'password123');
  //     await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

  //     await waitFor(() => {
  //       expect(screen.getByText('Пользователь с таким Почта уже существует.')).toBeInTheDocument();
  //     });
  //     expect(mockNavigate).not.toHaveBeenCalled();
  //   });

  //   it('показывает ошибку сервера при дубликате username', async () => {
  //     const user = userEvent.setup();
  //     const mockMutateAsync = vi.fn().mockRejectedValue({
  //       response: {
  //         data: {
  //           email: ['Пользователь с таким Почта уже существует.'],
  //           username: ['Пользователь с таким именем уже существует.'],
  //         },
  //       },
  //     });

  //     vi.mocked(useRegister).mockReturnValue({
  //       mutateAsync: mockMutateAsync,
  //       isPending: false,
  //     } as any);

  //     render(
  //       <MemoryRouter>
  //         <RegisterPage />
  //       </MemoryRouter>
  //     );

  //     await user.type(screen.getByLabelText(/имя/i), 'Иван');
  //     await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
  //     await user.type(screen.getByLabelText(/username/i), 'existing_user');
  //     await user.type(screen.getByLabelText(/email/i), 'ivan@test.com');
  //     await user.type(screen.getByLabelText(/^пароль$/i), 'password123');
  //     await user.type(screen.getByLabelText(/подтверждение пароля/i), 'password123');
  //     await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

  //     await waitFor(() => {
  //       expect(screen.getByText('Пользователь с таким именем уже существует.')).toBeInTheDocument();
  //     });
  //   });

  //   it('показывает ошибку из response.data.detail если она есть', async () => {
  //     const user = userEvent.setup();
  //     const mockMutateAsync = vi.fn().mockRejectedValue({
  //       response: {
  //         data: {
  //           detail: 'Слишком много попыток регистрации',
  //         },
  //       },
  //     });

  //     vi.mocked(useRegister).mockReturnValue({
  //       mutateAsync: mockMutateAsync,
  //       isPending: false,
  //     } as any);

  //     render(
  //       <MemoryRouter>
  //         <RegisterPage />
  //       </MemoryRouter>
  //     );

  //     await user.type(screen.getByLabelText(/имя/i), 'Иван');
  //     await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
  //     await user.type(screen.getByLabelText(/username/i), 'ivanov');
  //     await user.type(screen.getByLabelText(/email/i), 'ivan@test.com');
  //     await user.type(screen.getByLabelText(/^пароль$/i), 'password123');
  //     await user.type(screen.getByLabelText(/подтверждение пароля/i), 'password123');
  //     await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

  //     await waitFor(() => {
  //       expect(screen.getByText('Слишком много попыток регистрации')).toBeInTheDocument();
  //     });
  //   });

  //   it('показывает общую ошибку при неизвестной ошибке', async () => {
  //     const user = userEvent.setup();
  //     const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));

  //     vi.mocked(useRegister).mockReturnValue({
  //       mutateAsync: mockMutateAsync,
  //       isPending: false,
  //     } as any);

  //     render(
  //       <MemoryRouter>
  //         <RegisterPage />
  //       </MemoryRouter>
  //     );

  //     await user.type(screen.getByLabelText(/имя/i), 'Иван');
  //     await user.type(screen.getByLabelText(/фамилия/i), 'Иванов');
  //     await user.type(screen.getByLabelText(/username/i), 'ivanov');
  //     await user.type(screen.getByLabelText(/email/i), 'ivan@test.com');
  //     await user.type(screen.getByLabelText(/^пароль$/i), 'password123');
  //     await user.type(screen.getByLabelText(/подтверждение пароля/i), 'password123');
  //     await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

  //     await waitFor(() => {
  //       expect(screen.getByText('Network error')).toBeInTheDocument();
  //     });
  //   });
  // });

  describe('UI состояние', () => {
    it('блокирует кнопку во время отправки', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      const mockMutateAsync = vi.fn().mockReturnValue(promise);

      vi.mocked(useRegister).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as any);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      const button = screen.getByRole('button', { name: /создаём аккаунт/i });
      expect(button).toBeDisabled();

      resolvePromise!();
    });

    it('кнопка активна когда форма не отправляется', () => {
      vi.mocked(useRegister).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      const button = screen.getByRole('button', { name: /зарегистрироваться/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Навигация', () => {
    it('имеет ссылку на страницу входа', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      const loginLink = screen.getByRole('link', { name: /войти/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });
});
