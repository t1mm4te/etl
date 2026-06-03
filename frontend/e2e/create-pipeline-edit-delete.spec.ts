import { test, expect } from '@playwright/test';

test('полный цикл работы с пайплайном: создание, редактирование, удаление', async ({ page }) => {
  // 1. Логин
  await page.goto('http://localhost:5173/');
  await page.locator('section').getByRole('link', { name: 'Войти' }).click();
  await page.getByRole('textbox', { name: 'Почта' }).fill('emshanova.pi@edu.spbstu.ru');
  await page.getByRole('textbox', { name: 'Пароль Показать пароль' }).fill('good_password');
  await page.getByRole('button', { name: 'Войти' }).click();

  // 2. Создание нового пайплайна
  await page.getByRole('textbox', { name: 'Название' }).fill('Новый пайплайн 3');
  await page.getByRole('button', { name: 'Создать новый пайплайн' }).click();

  // 3. Проверка, что перешли в редактор
  await expect(page.getByRole('heading', { name: 'Новый пайплайн' })).toBeVisible();

  // 4. Возврат к списку пайплайнов
  await page.getByRole('button', { name: '← Мои пайплайны' }).click();

  // 5. Проверка, что пайплайн появился в списке
  await expect(page.getByRole('link', { name: 'Новый пайплайн 3' })).toBeVisible();

  // 6. Редактирование пайплайна
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

  // 7. Проверка, что отредактированный пайплайн появился в списке
  await expect(page.getByRole('link', { name: 'Новый пайплайн 3 редактированный' })).toBeVisible();

  // 8. Удаление пайплайна
  await page
    .getByRole('button', { name: 'Удалить пайплайн Новый пайплайн 3 редактированный' })
    .click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();

  // 9. ✅ ПРОВЕРКА: убеждаемся, что пайплайн исчез из списка
  await expect(
    page.getByRole('link', { name: 'Новый пайплайн 3 редактированный' })
  ).not.toBeVisible();

  // 10. Дополнительная проверка: убеждаемся, что нет ни старого, ни нового названия
  await expect(page.getByText('Новый пайплайн 3')).not.toBeVisible();
  await expect(page.getByText('Новый пайплайн 3 редактированный')).not.toBeVisible();
});
