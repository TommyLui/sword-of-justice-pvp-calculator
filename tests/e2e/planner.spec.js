const { test, expect } = require('@playwright/test');

test.describe('attribute planner stepping comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '20000');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '15000');
    await page.dispatchEvent('#def1-defense', 'input');
    await page.fill('#atk1-crit', '1000');
    await page.dispatchEvent('#atk1-crit', 'input');

    await page.goto('/#/attribute-planner');
    await expect(page.locator('#planner-app')).toBeVisible();
  });

  test('syncs baseline from calculator and shows baseline damage', async ({ page }) => {
    await expect(page.locator('.planner-step.active')).toContainText('1. 基準');
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('20000');
    await expect(page.locator('#planner-baseline-crit')).toHaveValue('1000');
    await expect(page.locator('#planner-kpi')).not.toHaveText('0');
  });

  test('stepping compare renders a single combined table with 10 rows', async ({ page }) => {
    await page.click('#planner-next');
    await expect(page.locator('[data-step-panel="2"]')).toBeVisible();

    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.click('#planner-next');
    await expect(page.locator('[data-step-panel="3"]')).toBeVisible();

    const table = page.locator('#planner-stepping-results table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByRole('columnheader', { name: '攻擊(增加數值)' })).toBeVisible();

    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(0)).toHaveText('1');
    await expect(firstRow.locator('td').nth(1)).toHaveText('+200');

    const lastRow = table.locator('tbody tr').last();
    await expect(lastRow.locator('td').nth(0)).toHaveText('10');
    await expect(lastRow.locator('td').nth(1)).toHaveText('+2,000');
  });

  test('attributes with no step size are omitted from compare table', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-crit', '100');
    await page.dispatchEvent('#planner-step-crit', 'input');
    await page.click('#planner-next');

    await expect(page.getByRole('columnheader', { name: '會心(增加數值)' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /^攻擊\(/ })).toHaveCount(0);
  });

  test('combined table renders multiple attributes side by side', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await page.fill('#planner-step-crit', '50');
    await page.dispatchEvent('#planner-step-crit', 'input');
    await page.click('#planner-next');

    const table = page.locator('#planner-stepping-results table');
    await expect(table).toHaveCount(1);
    await expect(table.locator('tbody tr')).toHaveCount(10);

    const cells = table.locator('tbody tr').first().locator('td');
    await expect(cells).toHaveCount(7); // 1 level + 2 attrs * 3 metrics

    await expect(page.getByRole('columnheader', { name: '攻擊(增加數值)' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '會心(增加數值)' })).toBeVisible();
  });

  test('reset steps clears step inputs and removes compare table', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-attack', '500');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await page.click('#planner-next');
    await expect(page.locator('#planner-stepping-results table')).toHaveCount(1);

    await page.click('#planner-prev');
    await page.click('#planner-reset-steps');
    await expect(page.locator('#planner-step-attack')).toHaveValue('');

    await page.click('#planner-next');
    await expect(page.locator('#planner-stepping-results table')).toHaveCount(0);
  });

  test('persists step sizes after reload', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-attack', '250');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.reload();
    await page.waitForSelector('#planner-app:not([hidden])');

    await page.click('#planner-next');
    await expect(page.locator('#planner-step-attack')).toHaveValue('250');
  });

  test('reset steps clears persisted step sizes', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-attack', '500');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.click('#planner-reset-steps');

    await page.reload();
    await page.waitForSelector('#planner-app:not([hidden])');

    await page.click('#planner-next');
    await expect(page.locator('#planner-step-attack')).toHaveValue('');

    await page.click('#planner-next');
    await expect(page.locator('#planner-stepping-results table')).toHaveCount(0);
  });

  test('restores calculator baseline after direct reload on planner', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '30000');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '18000');
    await page.dispatchEvent('#def1-defense', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('30000');
    const kpiBefore = await page.locator('#planner-kpi').textContent();
    expect(kpiBefore).not.toBe('0');

    await page.reload();
    await page.waitForSelector('#planner-app:not([hidden])');

    await expect(page.locator('#planner-baseline-attack')).toHaveValue('30000');
    const kpiAfter = await page.locator('#planner-kpi').textContent();
    expect(kpiAfter).not.toBe('0');
  });
});
