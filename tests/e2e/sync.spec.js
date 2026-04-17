const { test, expect } = require('@playwright/test');

test.describe('calculator and planner sync', () => {
  test('syncs calculator atk1 to planner baseline', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '50000');
    await page.dispatchEvent('#atk1-attack', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('50000');
  });

  test('syncs planner baseline back to calculator atk1', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    await page.fill('#planner-baseline-attack', '80000');
    await page.dispatchEvent('#planner-baseline-attack', 'change');

    await page.goto('/#/calculator');
    await page.waitForFunction(() => document.getElementById('atk1-attack').value === '80000');
    await expect(page.locator('#atk1-attack')).toHaveValue('80000');
  });

  test('does not sync atk2 into planner baseline', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk2-attack', '99999');
    await page.dispatchEvent('#atk2-attack', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    await expect(page.locator('#planner-baseline-attack')).not.toHaveValue('99999');
  });
});
