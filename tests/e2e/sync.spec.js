const { test, expect } = require('@playwright/test');

const CALCULATOR_TO_PLANNER_CASES = [
  { field: 'attack', value: '50000' },
  { field: 'crit', value: '12345' },
  { field: 'elementalBreak', value: '9999' }
];

test.describe('calculator and planner sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.evaluate(() => localStorage.clear());
  });

  for (const { field, value } of CALCULATOR_TO_PLANNER_CASES) {
    test(`syncs calculator atk1 ${field} to planner baseline`, async ({ page }) => {
      await page.goto('/#/calculator');
      await page.fill(`#atk1-${field}`, value);
      await page.dispatchEvent(`#atk1-${field}`, 'input');

      await page.goto('/#/attribute-planner');
      await page.waitForSelector('#planner-app:not([hidden])');
      await expect(page.locator(`#planner-baseline-${field}`)).toHaveValue(value);
    });
  }

  test('planner baseline is read-only and does not push back to calculator', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '10000');
    await page.dispatchEvent('#atk1-attack', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');

    const baselineInput = page.locator('#planner-baseline-attack');
    await expect(baselineInput).toHaveValue('10000');
    await expect(baselineInput).toBeDisabled();
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
