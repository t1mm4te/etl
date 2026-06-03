import { test, expect } from '@playwright/test';

test('полный цикл работы с пайплайном: создание, редактирование, удаление', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.locator('section').getByRole('link', { name: 'Войти' }).click();
  await page.getByRole('textbox', { name: 'Почта' }).fill('emshanova.pi@edu.spbstu.ru');
  await page.getByRole('textbox', { name: 'Пароль Показать пароль' }).fill('good_password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('textbox', { name: 'Название' }).fill('Новый пайплайн 3');
  await page.getByRole('button', { name: 'Создать новый пайплайн' }).click();
  await expect(page.getByRole('heading', { name: 'Новый пайплайн' })).toBeVisible();
  await page.getByRole('button', { name: '← Мои пайплайны' }).click();
  await expect(page.getByRole('link', { name: 'Новый пайплайн 3' })).toBeVisible();
  await page.getByRole('button', { name: 'Редактировать пайплайн Новый пайплайн 3' }).click();
  await page
    .getByRole('list')
    .getByRole('textbox', { name: 'Название' })
    .fill('Новый пайплайн 3 редактированный');
  await page
    .getByRole('list')
    .getByRole('textbox', { name: 'Описание' })
    .fill('это редактированное описание');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('link', { name: 'Новый пайплайн 3 редактированный' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Удалить пайплайн Новый пайплайн 3 редактированный' })
    .click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();

  await expect(
    page.getByRole('link', { name: 'Новый пайплайн 3 редактированный' })
  ).not.toBeVisible();
  await expect(page.getByText('Новый пайплайн 3')).not.toBeVisible();
  await expect(page.getByText('Новый пайплайн 3 редактированный')).not.toBeVisible();
});
