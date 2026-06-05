import { test, expect } from '@playwright/test';
import path from 'path';

test('создание пайплайна: загрузка файла + узел сортировки + соединение', async ({ page }) => {
  const pipelineName = `Тест ${Date.now()}`;

  // 1. Логин
  await page.goto('http://localhost:5173/');
  await page.locator('section').getByRole('link', { name: 'Войти' }).click();
  await page.getByRole('textbox', { name: 'Почта' }).fill('emshanova.pi@edu.spbstu.ru');
  await page.getByRole('textbox', { name: 'Пароль Показать пароль' }).fill('good_password');
  await page.getByRole('button', { name: 'Войти' }).click();

  // 2. Создание пайплайна
  await page.getByRole('textbox', { name: 'Название' }).fill(pipelineName);
  await page.getByRole('textbox', { name: 'Описание' }).fill('тестовый пайплайн');
  await page.getByRole('button', { name: 'Создать новый пайплайн' }).click();

  // 3. Ждём загрузки редактора
  await expect(page.getByRole('button', { name: 'Запустить' })).toBeVisible({ timeout: 10000 });

  // ===== Узел-источник =====
  await page.getByRole('button', { name: /Загрузка из файла/ }).click();

  const sourceNode = page.locator('.react-flow__node').first();
  await expect(sourceNode).toBeVisible({ timeout: 10000 });

  await sourceNode.dblclick();

  const filePath = path.join('e2e', 'fixtures', 'disney-characters.csv');
  await page.locator('input[type="file"]').setInputFiles(filePath);

  await expect(page.getByText('Выбран файл: disney-characters.csv')).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Всего 56 строк, 5 столбцов')).toBeVisible();

  await page.getByRole('button', { name: '✕' }).click();

  // ===== Узел сортировки =====
  await page
    .getByRole('button', { name: 'Строки Фильтрация, сортировка и дедупликация строк. ▾' })
    .click();
  await page
    .getByRole('button', {
      name: 'Сортировка Сортирует строки по одному или нескольким столбцам в произвольном пор',
    })
    .click();

  // Ждём появления второго узла
  let nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(2, { timeout: 10000 });

  let sortNode = nodes.last();

  // ===== РАЗДВИГАЕМ УЗЛЫ (чтобы не перекрывались) =====
  const sourceBox = await sourceNode.boundingBox();
  const sortBox = await sortNode.boundingBox();

  if (sourceBox && sortBox) {
    // Если узлы слишком близко или перекрываются
    if (Math.abs(sourceBox.x - sortBox.x) < 200) {
      // Перемещаем узел сортировки правее
      await sortNode.hover();
      await page.mouse.down();
      await page.mouse.move(sortBox.x + 300, sortBox.y + 50);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Обновляем ссылку на узел и его позицию
      nodes = page.locator('.react-flow__node');
      sortNode = nodes.last();
    }
  }

  // ===== СОЕДИНЯЕМ УЗЛЫ ЧЕРЕЗ ПОРТЫ =====
  const finalSourceBox = await sourceNode.boundingBox();
  const finalSortBox = await sortNode.boundingBox();

  if (finalSourceBox && finalSortBox) {
    // Выходной порт (правый край первого узла)
    const startX = finalSourceBox.x + finalSourceBox.width;
    const startY = finalSourceBox.y + finalSourceBox.height / 2;

    // Входной порт (левый край второго узла)
    const endX = finalSortBox.x;
    const endY = finalSortBox.y + finalSortBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  const edgeExists = await page
    .locator('.react-flow__edge, .react-flow__edge-path, [class*="edge"]')
    .count();

  if (edgeExists === 0) {
    const finalSourceBox2 = await sourceNode.boundingBox();
    const finalSortBox2 = await sortNode.boundingBox();

    if (finalSourceBox2 && finalSortBox2) {
      await page.mouse.move(
        finalSourceBox2.x + finalSourceBox2.width,
        finalSourceBox2.y + finalSourceBox2.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(finalSortBox2.x + 10, finalSortBox2.y + finalSortBox2.height / 2, {
        steps: 10,
      });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  await sortNode.dblclick();

  await expect(page.getByRole('button', { name: 'Применить / обновить результат' })).toBeVisible({
    timeout: 10000,
  });

  await page.locator('.custom-select__indicator').first().click();
  await page.locator('.custom-select__option').filter({ hasText: 'hero' }).click();

  await page.locator('.custom-select__indicator').last().click();

  await page.getByRole('button', { name: 'Применить / обновить результат' }).click();

  await page.waitForTimeout(1000);

  await expect(page.getByRole('cell', { name: 'Ace Cluck' })).toBeVisible();
});
