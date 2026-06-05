import { test, expect } from '@playwright/test';
import path from 'path';

test('загрузка аватара и смена username', async ({ page }) => {
  // 1. Логин
  await page.goto('http://localhost:5173/');
  await page.locator('section').getByRole('link', { name: 'Войти' }).click();
  await page.getByRole('textbox', { name: 'Почта' }).fill('emshanova.pi@edu.spbstu.ru');
  await page.getByRole('textbox', { name: 'Пароль Показать пароль' }).fill('good_password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Мои пайплайны' })).toBeVisible();

  // 2. Переход в профиль
  await page.goto('http://localhost:5173/profile');
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();

  // 3. Загрузка аватара
  const avatarPath = path.join('e2e', 'fixtures', 'avatar.jpeg');
  await page.locator('input[type="file"]').setInputFiles(avatarPath);

  // 4. Сохраняем изменения
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();

  // 5. Проверяем сообщения
  await expect(page.getByText('Аватар обновлен')).toBeVisible();
  await expect(page.getByText('Профиль обновлен')).toBeVisible();

  // 6. Смена username (опционально)
  const timestamp = Date.now();
  const newUsername = `polina_${timestamp}`;
  await page.getByRole('textbox', { name: 'Username' }).fill(newUsername);
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByText('Профиль обновлен')).toBeVisible();

  // 7. Возвращаем username обратно (чтобы не ломать другие тесты)
  await page.getByRole('textbox', { name: 'Username' }).fill('polina12345');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByText('Профиль обновлен')).toBeVisible();
});
