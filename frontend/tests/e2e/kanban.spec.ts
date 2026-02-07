import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Note: these are end-to-end tests that assume both frontend (Vite dev server)
// and backend (Socket.IO server) are running locally. The Playwright config
// is set to `reuseExistingServer: true` and `baseURL: http://localhost:5173`.

// Helper: find task card by text
const taskCardLocator = (page: Page, title: string) => page.locator('[data-testid^="task-"]', { hasText: title });

test.describe('Kanban E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Create Task', async ({ page }) => {
    // Fill form
    await page.fill('[data-testid=title-input]', 'E2E Task');
    await page.fill('[data-testid=description-input]', 'E2E description');

    // Select priority and category. React-Select renders its dropdown on click, so click the container then option text.
    await page.click('[data-testid=priority-select]');
    await page.click('text=High');

    await page.click('[data-testid=category-select]');
    await page.click('text=Feature');

    // Upload a valid image using inline base64 buffer so tests are deterministic
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    await page.setInputFiles('[data-testid=file-input]', [
      { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(pngBase64, 'base64') },
    ]);

    // Assert preview is shown in the form before submit
    await expect(page.locator('img[alt="sample.png"]')).toBeVisible();

    // Create
    await page.click('[data-testid=create-button]');

    // Wait for server-driven sync — task should appear in To Do column
    const todoTask = page.locator('[data-testid=todo-column] >> text=E2E Task');
    await expect(todoTask).toBeVisible({ timeout: 5000 });
  });

  test('Drag and Drop', async ({ page }) => {
    // Assume a task named E2E Task exists (from previous test or reset state)
    const task = taskCardLocator(page, 'E2E Task');
    await expect(task).toBeVisible({ timeout: 5000 });

    // Drag to In Progress column.
    // Playwright's dragTo uses real mouse events, which works with react-dnd HTML5 backend.
    await task.first().dragTo(page.locator('[data-testid=inprogress-column]'));

    // Assert it appears in In Progress
    const inprogress = page.locator('[data-testid=inprogress-column] >> text=E2E Task');
    await expect(inprogress).toBeVisible({ timeout: 5000 });

    // Chart should reflect the column counts (we check that the chart exists and the in-progress column has a card)
    await expect(page.locator('[data-testid=progress-chart]')).toBeVisible();
    const inProgressCount = await page.locator('[data-testid=inprogress-column] [data-testid^="task-"]').count();
    expect(inProgressCount).toBeGreaterThanOrEqual(1);
  });

  test('Delete Task', async ({ page }) => {
    // Find the task in any column
    const task = taskCardLocator(page, 'E2E Task');
    await expect(task).toBeVisible({ timeout: 5000 });

    // Click its delete button and wait for removal (server-driven)
    await task.locator('button[aria-label="delete"]').first().click();

    // Ensure the task is removed from UI
    await expect(page.locator('text=E2E Task')).toHaveCount(0, { timeout: 5000 });
  });

  test('Dropdown Select (edit task)', async ({ page }) => {
    // Create a fresh task to edit
    await page.fill('[data-testid=title-input]', 'EditTask');
    await page.fill('[data-testid=description-input]', 'edit desc');
    await page.click('[data-testid=priority-select]');
    await page.click('text=Medium');
    await page.click('[data-testid=category-select]');
    await page.click('text=Bug');
    await page.click('[data-testid=create-button]');

    const task = taskCardLocator(page, 'EditTask');
    await expect(task).toBeVisible({ timeout: 5000 });

    // read its data-testid attribute to get the generated id (task-<id>)
    const attr = await task.first().getAttribute('data-testid');
    if (!attr) throw new Error('Task data-testid missing');
    const id = attr.replace('task-', '');

    // Change priority and category on the card (inline selects)
    await page.click(`[data-testid=priority-select-${id}]`);
    await page.click('text=High');

    await page.click(`[data-testid=category-select-${id}]`);
    await page.click('text=Enhancement');

    // Wait for socket-driven update (the select should now show chosen values)
    await expect(page.locator(`[data-testid=priority-select-${id}] >> text=High`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`[data-testid=category-select-${id}] >> text=Enhancement`)).toBeVisible({ timeout: 5000 });
  });

  test('File Upload validation', async ({ page }) => {
    // Test invalid file type
    const invalidPath = path.join('tests', 'e2e', 'fixtures', 'sample.txt');
    await page.setInputFiles('[data-testid=file-input]', invalidPath);
    await expect(page.locator('[data-testid=file-error]')).toBeVisible();

    // Test valid file again using inline buffer
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    await page.setInputFiles('[data-testid=file-input]', [
      { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(pngBase64, 'base64') },
    ]);
    await expect(page.locator('img[alt="sample.png"]')).toBeVisible();
  });
});
