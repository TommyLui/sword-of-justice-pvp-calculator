const { test, expect } = require('@playwright/test');

const CALCULATOR_TO_PLANNER_CASES = [
  { field: 'attack', value: '50000' },
  { field: 'elementalAttack', value: '6100' },
  { field: 'defenseBreak', value: '7200' },
  { field: 'shieldBreak', value: '8300' },
  { field: 'accuracy', value: '9400' },
  { field: 'crit', value: '12345' },
  { field: 'critDamage', value: '156' },
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

  test('syncs all eight bridge fields and excludes pvpAttack', async ({ page }) => {
    await page.goto('/#/calculator');

    for (const { field, value } of CALCULATOR_TO_PLANNER_CASES) {
      await page.fill(`#atk1-${field}`, value);
      await page.dispatchEvent(`#atk1-${field}`, 'input');
    }
    await page.fill('#atk1-pvpAttack', '77777');
    await page.dispatchEvent('#atk1-pvpAttack', 'input');

    const bridge = await page.evaluate(() => window.pvpSyncBridge.getBaselineAtk1());
    for (const { field, value } of CALCULATOR_TO_PLANNER_CASES) {
      expect(bridge[field], `bridge ${field}`).toBe(Number(value));
    }
    expect(bridge).not.toHaveProperty('pvpAttack');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    for (const { field, value } of CALCULATOR_TO_PLANNER_CASES) {
      await expect(page.locator(`#planner-baseline-${field}`), `planner ${field}`).toHaveValue(value);
    }
    await expect(page.locator('#planner-baseline-pvpAttack')).toHaveCount(0);
  });
});
