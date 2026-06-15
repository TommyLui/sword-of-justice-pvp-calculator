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

  test('stepping compare renders 10 rows per attribute with step size', async ({ page }) => {
    await page.click('#planner-next');
    await expect(page.locator('[data-step-panel="2"]')).toBeVisible();

    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.click('#planner-next');
    await expect(page.locator('[data-step-panel="3"]')).toBeVisible();

    const group = page.locator('.planner-stepping-group').filter({ hasText: '攻擊' });
    await expect(group).toBeVisible();
    await expect(group.locator('tbody tr')).toHaveCount(10);

    const firstRow = group.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(0)).toHaveText('1');
    await expect(firstRow.locator('td').nth(1)).toHaveText('+200');

    const lastRow = group.locator('tbody tr').last();
    await expect(lastRow.locator('td').nth(0)).toHaveText('10');
    await expect(lastRow.locator('td').nth(1)).toHaveText('+2,000');
  });

  test('attributes with no step size are omitted from compare table', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-crit', '100');
    await page.dispatchEvent('#planner-step-crit', 'input');
    await page.click('#planner-next');

    await expect(page.locator('.planner-stepping-group')).toHaveCount(1);
    await expect(page.locator('.planner-stepping-group h4')).toContainText('會心');
  });

  test('reset steps clears step inputs and removes compare tables', async ({ page }) => {
    await page.click('#planner-next');
    await page.fill('#planner-step-attack', '500');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await page.click('#planner-next');
    await expect(page.locator('.planner-stepping-group')).toHaveCount(1);

    await page.click('#planner-prev');
    await page.click('#planner-reset-steps');
    await expect(page.locator('#planner-step-attack')).toHaveValue('');

    await page.click('#planner-next');
    await expect(page.locator('.planner-stepping-group')).toHaveCount(0);
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
    await expect(page.locator('.planner-stepping-group')).toHaveCount(0);
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
