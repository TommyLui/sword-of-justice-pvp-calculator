const { test, expect } = require('@playwright/test');

const CALCULATOR_TO_PLANNER_CASES = [
  { field: 'attack', value: '50000' },
  { field: 'crit', value: '12345' },
  { field: 'elementalBreak', value: '9999' }
];

const PLANNER_TO_CALCULATOR_CASES = [
  { field: 'attack', value: '80000' },
  { field: 'shieldBreak', value: '7777' }
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

  for (const { field, value } of PLANNER_TO_CALCULATOR_CASES) {
    test(`syncs planner baseline ${field} back to calculator atk1`, async ({ page }) => {
      await page.goto('/#/calculator');
      await page.goto('/#/attribute-planner');
      await page.waitForSelector('#planner-app:not([hidden])');
      await page.fill(`#planner-baseline-${field}`, value);
      await page.dispatchEvent(`#planner-baseline-${field}`, 'change');

      await page.goto('/#/calculator');
      await page.waitForFunction(
        ({ inputId, expected }) => document.getElementById(inputId).value === expected,
        { inputId: `atk1-${field}`, expected: value }
      );
      await expect(page.locator(`#atk1-${field}`)).toHaveValue(value);
    });
  }

  test('does not sync atk2 into planner baseline', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk2-attack', '99999');
    await page.dispatchEvent('#atk2-attack', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    await expect(page.locator('#planner-baseline-attack')).not.toHaveValue('99999');
  });
});
