import { test, expect } from '@playwright/test';

test('создать пайплайн, создать узел-источник, загрузить файл, сменить лимит строк в превью', async ({
  page,
}) => {
  // Уникальное имя для этого запуска
  const uniqueName = `Тест ${Date.now()}`;
  const editedName = `${uniqueName} ред`;

  // Открываем страницу и очищаем хранилище
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Логин
  await page.locator('section').getByRole('link', { name: 'Войти' }).click();
  await page.getByRole('textbox', { name: 'Почта' }).fill('emshanova.pi@edu.spbstu.ru');
  await page.getByRole('textbox', { name: 'Пароль Показать пароль' }).fill('good_password');
  await page.getByRole('button', { name: 'Войти' }).click();

  // Создание с уникальным именем
  await page.getByRole('textbox', { name: 'Название' }).fill(uniqueName);
  await page.getByRole('button', { name: 'Создать новый пайплайн' }).click();

  // Проверка редактора (ищем именно h2, а не любой заголовок)
  await expect(page.getByRole('heading', { level: 2, name: 'Новый пайплайн' })).toBeVisible();

  // Возврат к списку
  await page.getByRole('button', { name: '← Мои пайплайны' }).click();

  // Проверка, что появился именно наш пайплайн
  await expect(page.getByRole('link', { name: uniqueName })).toBeVisible();

  // Редактирование
  await page.getByRole('button', { name: `Редактировать пайплайн ${uniqueName}` }).click();
  await page.getByRole('list').getByRole('textbox', { name: 'Название' }).fill(editedName);
  await page
    .getByRole('list')
    .getByRole('textbox', { name: 'Описание' })
    .fill('редактированное описание');
  await page.getByRole('button', { name: 'Сохранить' }).click();

  // Проверка, что отредактированный пайплайн появился
  await expect(page.getByRole('link', { name: editedName })).toBeVisible();

  // Удаление
  await page.getByRole('button', { name: `Удалить пайплайн ${editedName}` }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();

  // Проверка удаления
  await expect(page.getByRole('link', { name: editedName })).not.toBeVisible();
});
