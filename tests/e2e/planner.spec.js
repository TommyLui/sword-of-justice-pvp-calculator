const { test, expect } = require('@playwright/test');

test.describe('attribute planner flow', () => {
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

  test('walks through planner steps and updates KPI/results', async ({ page }) => {
    await expect(page.locator('.planner-step.active')).toContainText('1. 基準');
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('20000');

    await page.click('#planner-next');
    await expect(page.locator('.planner-step.active')).toContainText('2. 目標');
    await expect(page.locator('[data-step-panel="2"]')).toBeVisible();

    await page.fill('#planner-candidate-attack', '22000');
    await page.dispatchEvent('#planner-candidate-attack', 'input');
    await page.fill('#planner-candidate-crit', '1200');
    await page.dispatchEvent('#planner-candidate-crit', 'input');

    await page.click('#planner-next');
    await expect(page.locator('.planner-step.active')).toContainText('3. 結果');
    await expect(page.locator('[data-step-panel="3"]')).toBeVisible();

    const kpiText = await page.locator('#planner-kpi').textContent();
    expect(kpiText).not.toBe('+0.00%');
    await expect(page.locator('#planner-contrib-body tr')).toHaveCount(8);
    await expect(page.locator('#planner-top3 li')).toHaveCount(3);
  });

  test('reset candidate restores target values back to baseline', async ({ page }) => {
    await page.click('#planner-next');
    await expect(page.locator('[data-step-panel="2"]')).toBeVisible();

    await page.fill('#planner-candidate-attack', '24000');
    await page.dispatchEvent('#planner-candidate-attack', 'input');
    await expect(page.locator('#planner-candidate-attack')).toHaveValue('24000');

    await page.click('#planner-reset-candidate');
    await expect(page.locator('#planner-candidate-attack')).toHaveValue('20000');
  });

  test('chip buttons update candidate values and recompute KPI', async ({ page }) => {
    await page.click('#planner-next');
    await expect(page.locator('[data-step-panel="2"]')).toBeVisible();

    const chip = page.locator('#planner-candidate-attack').locator('..').locator('.planner-chip-btn').filter({ hasText: '+100' }).first();
    const before = await page.locator('#planner-kpi').textContent();

    await chip.click();

    await expect(page.locator('#planner-candidate-attack')).toHaveValue('100');
    const after = await page.locator('#planner-kpi').textContent();
    expect(after).not.toBe(before);
  });
});
