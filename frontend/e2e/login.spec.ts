import { test, expect } from '@playwright/test';

test('успешный вход в систему', async ({ page }) => {
  // 1. Открываем главную страницу
  await page.goto('http://localhost:5173/');

  // 2. Переходим на страницу входа
  await page.locator('section').getByRole('link', { name: 'Войти' }).click();

  // 3. Заполняем форму входа
  await page.getByRole('textbox', { name: 'Почта' }).fill('emshanova.pi@edu.spbstu.ru');
  await page.getByRole('textbox', { name: 'Пароль Показать пароль' }).fill('good_password');

  // 4. Отправляем форму
  await page.getByRole('button', { name: 'Войти' }).click();

  // 5. ✅ ПРОВЕРКИ
  // Проверяем URL - самый надёжный способ
  await expect(page).toHaveURL(/.*\/pipelines/);

  // Проверяем заголовок страницы (именно h1, а не ссылку)
  await expect(page.getByRole('heading', { name: 'Мои пайплайны' })).toBeVisible();
});
